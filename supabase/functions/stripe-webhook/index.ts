// Handles Stripe webhook events. On checkout.session.completed it creates the
// order + transaction records.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEE_PCT = 0.20; // 20% platform fee

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey) return new Response("missing key", { status: 500 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
  const body = await req.text();
  let event: Stripe.Event;

  try {
    const sig = req.headers.get("stripe-signature");
    if (webhookSecret && sig) {
      event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
    } else {
      event = JSON.parse(body) as Stripe.Event;
    }
  } catch (e) {
    console.error("webhook signature error", e);
    return new Response("invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const md = session.metadata ?? {};
      const price = Number(md.price ?? 0);
      const deliveryDays = Number(md.delivery_days ?? 7);
      const platformFee = Math.round(price * FEE_PCT);
      const sellerEarnings = price - platformFee;
      const extraIds = md.extra_ids ? JSON.parse(md.extra_ids) : [];

      const { data: order, error: orderErr } = await admin
        .from("orders")
        .insert({
          buyer_id: md.buyer_id,
          seller_id: md.seller_id,
          gig_id: md.gig_id,
          package_id: md.package_id,
          selected_extra_ids: extraIds,
          price,
          platform_fee: platformFee,
          seller_earnings: sellerEarnings,
          status: "pending_requirements",
          stripe_payment_intent_id: session.payment_intent as string,
          delivery_deadline: new Date(Date.now() + deliveryDays * 86400000).toISOString(),
        })
        .select()
        .single();
      if (orderErr) throw orderErr;

      await admin.from("transactions").insert([
        { order_id: order.id, seller_id: md.seller_id, type: "charge", amount: price, status: "cleared" },
        { order_id: order.id, seller_id: md.seller_id, type: "platform_fee", amount: platformFee, status: "cleared" },
        { order_id: order.id, seller_id: md.seller_id, type: "seller_credit", amount: sellerEarnings, status: "pending" },
      ]);

      // Notify both parties (best-effort)
      const { data: parties } = await admin
        .from("profiles").select("id,email,full_name").in("id", [md.buyer_id, md.seller_id]);
      for (const p of parties ?? []) {
        await admin.from("notifications").insert({
          user_id: p.id,
          type: "order_placed" as any,
          title: "New order",
          body: `Order ${order.order_number}`,
          link: `/orders/${order.id}`,
        }).then(() => {}).catch(() => {});
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook handler error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
