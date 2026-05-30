// Handles Stripe webhook events:
//  - checkout.session.completed → create order + transactions, capture charge_id
//  - charge.refunded            → mark order cancelled, reverse transactions, refund recorded
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEE_PCT = 0.10;

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

      // Resolve charge id from the payment intent
      let chargeId: string | null = null;
      if (session.payment_intent) {
        const pi = await stripe.paymentIntents.retrieve(session.payment_intent as string);
        chargeId = (pi.latest_charge as string) ?? null;
      }

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
          stripe_charge_id: chargeId,
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

      console.log("order created", order.id, order.order_number);
    }

    if (event.type === "payment_intent.succeeded") {
      const pi = event.data.object as Stripe.PaymentIntent;
      const orderId = pi.metadata?.order_id;
      if (orderId) {
        const { data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
        if (order && order.status === "pending_payment") {
          const price = order.price;
          const platformFee = Math.round(price * FEE_PCT);
          const sellerEarnings = price - platformFee;
          await admin.from("orders").update({
            status: "pending_requirements",
            escrow_status: "held",
            platform_fee: platformFee,
            seller_earnings: sellerEarnings,
            stripe_charge_id: (pi.latest_charge as string) ?? null,
          }).eq("id", order.id);
          await admin.from("transactions").insert([
            { order_id: order.id, seller_id: order.seller_id, type: "charge", amount: price, status: "cleared" },
            { order_id: order.id, seller_id: order.seller_id, type: "platform_fee", amount: platformFee, status: "cleared" },
            { order_id: order.id, seller_id: order.seller_id, type: "seller_credit", amount: sellerEarnings, status: "pending" },
          ]);
          // Mark source bid/pitch as accepted; close other bids on same project
          if (order.bid_id) {
            await admin.from("bids").update({ status: "accepted" }).eq("id", order.bid_id);
            const { data: bidRow } = await admin.from("bids").select("project_id").eq("id", order.bid_id).maybeSingle();
            if (bidRow?.project_id) {
              await admin.from("bids").update({ status: "closed" })
                .eq("project_id", bidRow.project_id).neq("id", order.bid_id).eq("status", "pending");
              await admin.from("project_posts").update({ status: "in_progress" }).eq("id", bidRow.project_id);
            }
          }
          // Notifications
          const deadline = order.delivery_deadline ? new Date(order.delivery_deadline).toLocaleDateString() : "soon";
          await admin.from("notifications").insert([
            { user_id: order.seller_id, type: "order", title: `Your order has started — deliver by ${deadline}`, link: `/orders/${order.id}` },
            { user_id: order.buyer_id, type: "order", title: "Your payment is secured — your expert is now working on your project.", link: `/orders/${order.id}` },
          ]);
          console.log("escrow order activated", order.id);
        }
      }
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      const chargeId = charge.id;
      const { data: order } = await admin.from("orders")
        .select("*")
        .or(`stripe_charge_id.eq.${chargeId},stripe_payment_intent_id.eq.${charge.payment_intent as string}`)
        .maybeSingle();
      if (!order) {
        console.warn("refund for unknown order", chargeId);
      } else if (!order.refunded_at) {
        await admin.from("orders").update({
          status: "cancelled",
          refunded_at: new Date().toISOString(),
          stripe_charge_id: chargeId,
        }).eq("id", order.id);

        // Reverse seller credit: void any pending credit, insert negative if cleared
        await admin.from("transactions").insert([
          { order_id: order.id, seller_id: order.seller_id, type: "refund", amount: order.price, status: "cleared" },
          { order_id: order.id, seller_id: order.seller_id, type: "seller_credit", amount: -order.seller_earnings, status: "cleared" },
        ]);
        console.log("order refunded", order.id);
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
