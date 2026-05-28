// Refunds a Stripe charge for an order. Callable by:
// - admin (any order)
// - either party of the order, when the order is still unfulfilled (no delivery yet)
//   AND a cancellation_request exists with status='accepted' (mutual cancel).
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthenticated");

    const { order_id, reason } = await req.json();
    if (!order_id) throw new Error("order_id required");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    const isAdmin = me?.role === "admin";

    const { data: order } = await admin.from("orders").select("*").eq("id", order_id).maybeSingle();
    if (!order) throw new Error("Order not found");
    if (order.refunded_at) throw new Error("Order already refunded");

    const isParty = order.buyer_id === user.id || order.seller_id === user.id;
    if (!isAdmin && !isParty) throw new Error("Forbidden");

    // Non-admin path: require an accepted mutual cancellation on an unfulfilled order
    if (!isAdmin) {
      if (order.delivered_at) throw new Error("Order already delivered — open a dispute instead");
      const { data: canc } = await admin.from("cancellation_requests")
        .select("status").eq("order_id", order_id).maybeSingle();
      if (canc?.status !== "accepted") throw new Error("Both parties must agree to cancel first");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" });

    let chargeId = order.stripe_charge_id as string | null;
    if (!chargeId && order.stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve(order.stripe_payment_intent_id);
      chargeId = (pi.latest_charge as string) ?? null;
    }
    if (!chargeId) throw new Error("No charge on order");

    const refund = await stripe.refunds.create({
      charge: chargeId,
      reason: "requested_by_customer",
      metadata: { order_id, requested_by: user.id, note: reason ?? "" },
    });

    // Webhook (charge.refunded) finalizes order + transactions, but we update what we can now
    await admin.from("orders").update({
      refund_id: refund.id,
      stripe_charge_id: chargeId,
    }).eq("id", order_id);

    return new Response(JSON.stringify({ ok: true, refund_id: refund.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-refund", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
