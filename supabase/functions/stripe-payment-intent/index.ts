// Creates / retrieves a Stripe PaymentIntent for an escrow order.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "npm:stripe@17.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const publishable = Deno.env.get("STRIPE_PUBLISHABLE_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    if (!publishable) throw new Error("STRIPE_PUBLISHABLE_KEY not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthenticated");
    const user = userData.user;

    const { order_id } = await req.json();
    if (!order_id || typeof order_id !== "string") throw new Error("order_id required");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: oErr } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, price, status, stripe_payment_intent_id")
      .eq("id", order_id)
      .maybeSingle();
    if (oErr || !order) throw new Error("Order not found");
    if (order.buyer_id !== user.id) throw new Error("Forbidden");
    if (order.status !== "pending_payment") throw new Error("Order is not awaiting payment");

    // If this order originated from a custom offer, the offer is the AUTHORITATIVE
    // source of truth for the price. custom_offers.price is stored in cents;
    // orders.price is in dollars. If the order row drifted from the offer, self-heal
    // before charging so we can never overcharge based on stale order data.
    const { data: offer } = await admin
      .from("custom_offers")
      .select("id, price")
      .eq("order_id", order.id)
      .maybeSingle();

    let priceDollars: number = order.price;
    if (offer) {
      const offerDollars = Math.round((offer.price as number) / 100);
      if (offerDollars <= 0) throw new Error("Invalid custom offer price");
      priceDollars = offerDollars;
    }

    const partnerFee = Math.round(priceDollars * 0.05);
    const expectedChargeCents = (priceDollars + partnerFee) * 100;

    if (offer && order.price !== priceDollars) {
      await admin
        .from("orders")
        .update({
          price: priceDollars,
          platform_fee: partnerFee,
          seller_earnings: priceDollars - partnerFee,
        })
        .eq("id", order.id);
      console.log("stripe-payment-intent: self-healed order amount", {
        order_id: order.id,
        from: order.price,
        to: priceDollars,
      });
    }


    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-04-30.basil",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let pi: Stripe.PaymentIntent | null = null;
    if (order.stripe_payment_intent_id) {
      try {
        pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
        if (pi.status === "succeeded" || pi.status === "canceled") pi = null;
        // If a stale PI exists with the wrong amount, discard it and create a new one.
        if (pi && pi.amount !== expectedChargeCents) {
          try { await stripe.paymentIntents.cancel(pi.id); } catch { /* ignore */ }
          pi = null;
        }
      } catch { pi = null; }
    }
    if (!pi) {
      pi = await stripe.paymentIntents.create({
        amount: expectedChargeCents,
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: {
          order_id: order.id,
          buyer_id: order.buyer_id,
          seller_id: order.seller_id,
          custom_offer_id: offer?.id ?? "",
        },
      });
      await admin.from("orders").update({ stripe_payment_intent_id: pi.id }).eq("id", order.id);
    }

    return new Response(JSON.stringify({
      client_secret: pi.client_secret,
      publishable_key: publishable,
      amount: pi.amount,
      expected_amount: expectedChargeCents,
      order_price: order.price,
      custom_offer_price_cents: offer?.price ?? null,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e) {
    console.error("stripe-payment-intent error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
