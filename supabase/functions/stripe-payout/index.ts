// Processes a pending withdrawal by transferring funds to the seller's connected Stripe account.
// Admin-only (caller must be admin). Marks withdrawal paid on success.
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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: me } = await admin.from("profiles").select("role").eq("id", user.id).maybeSingle();
    if (me?.role !== "admin") throw new Error("Forbidden");

    const { withdrawal_id } = await req.json();
    if (!withdrawal_id) throw new Error("withdrawal_id required");

    const { data: w } = await admin.from("withdrawals").select("*").eq("id", withdrawal_id).maybeSingle();
    if (!w) throw new Error("Withdrawal not found");
    if (w.status === "paid") throw new Error("Already paid");

    const { data: acct } = await admin.from("seller_accounts").select("*").eq("seller_id", w.seller_id).maybeSingle();
    if (!acct?.stripe_account_id || !acct.payouts_enabled) {
      throw new Error("Seller has not completed Stripe Connect onboarding");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" });

    // Mark processing first
    await admin.from("withdrawals").update({ status: "processing" }).eq("id", withdrawal_id);

    const transfer = await stripe.transfers.create({
      amount: w.amount,
      currency: "usd",
      destination: acct.stripe_account_id,
      metadata: { withdrawal_id: w.id, seller_id: w.seller_id },
    });

    await admin.from("withdrawals").update({
      status: "paid", stripe_payout_id: transfer.id, paid_at: new Date().toISOString(),
    }).eq("id", withdrawal_id);

    return new Response(JSON.stringify({ ok: true, transfer_id: transfer.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-payout", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
