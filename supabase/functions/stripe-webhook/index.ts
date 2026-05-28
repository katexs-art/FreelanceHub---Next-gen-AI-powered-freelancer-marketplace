// Handles Stripe webhook events. On checkout.session.completed it creates the
// project + transaction record so client and expert can start working together.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FEE_PCT = 0.15;

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
      const platform_fee = Math.round(price * FEE_PCT);
      const expert_payout = price - platform_fee;

      const { data: project, error: projErr } = await admin
        .from("projects")
        .insert({
          client_id: md.client_id,
          expert_id: md.expert_id,
          service_id: md.service_id,
          description: md.description || null,
          price,
          platform_fee,
          expert_payout,
          status: "in_progress",
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .select()
        .single();

      if (projErr) throw projErr;

      await admin.from("transactions").insert({
        project_id: project.id,
        client_id: md.client_id,
        expert_id: md.expert_id,
        amount: price,
        platform_fee,
        expert_payout,
        stripe_payment_intent_id: session.payment_intent as string,
        status: "held",
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("webhook handler error", e);
    await admin.from("error_logs").insert({
      function_name: "stripe-webhook",
      error_message: (e as Error).message,
    });
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
