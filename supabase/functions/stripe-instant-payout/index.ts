// Triggers an immediate Stripe payout from the seller's connected Express
// account to their bank or debit card. Records a withdrawals row.
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

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Unauthenticated");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const amountCents = Number(body.amount_cents);
    if (!amountCents || amountCents < 1000) throw new Error("Minimum withdrawal is $10");

    const { data: acct } = await admin
      .from("seller_accounts")
      .select("stripe_account_id, payouts_enabled, available_balance")
      .eq("seller_id", u.user.id)
      .maybeSingle();
    if (!acct?.stripe_account_id || !acct.payouts_enabled) throw new Error("Payout account not connected");
    if (amountCents > (acct.available_balance ?? 0)) throw new Error("Amount exceeds available balance");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });

    let payout: any;
    let method: "stripe_instant" | "stripe_bank" = "stripe_instant";
    try {
      payout = await stripe.payouts.create(
        { amount: amountCents, currency: "usd", method: "instant" },
        { stripeAccount: acct.stripe_account_id },
      );
    } catch (_e) {
      payout = await stripe.payouts.create(
        { amount: amountCents, currency: "usd", method: "standard" },
        { stripeAccount: acct.stripe_account_id },
      );
      method = "stripe_bank";
    }

    await admin.from("withdrawals").insert({
      seller_id: u.user.id,
      amount: amountCents,
      method,
      status: "paid",
      stripe_payout_id: payout.id,
      paid_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ ok: true, payout_id: payout.id, method }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-instant-payout", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
