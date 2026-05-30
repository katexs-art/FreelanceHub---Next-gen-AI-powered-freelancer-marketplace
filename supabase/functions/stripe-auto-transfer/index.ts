// Processes cleared seller_credit transactions and transfers funds to the
// seller's connected Stripe Express account. Designed to be run on a cron.
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows } = await admin
      .from("transactions")
      .select("id, seller_id, amount, order_id")
      .eq("type", "seller_credit")
      .eq("status", "cleared")
      .is("stripe_transfer_id", null)
      .limit(50);

    const results: any[] = [];
    for (const r of rows ?? []) {
      const { data: acct } = await admin
        .from("seller_accounts")
        .select("stripe_account_id, charges_enabled")
        .eq("seller_id", r.seller_id)
        .maybeSingle();
      if (!acct?.stripe_account_id || !acct.charges_enabled) {
        results.push({ id: r.id, skipped: "no_connected_account" });
        continue;
      }
      try {
        const transfer = await stripe.transfers.create({
          amount: r.amount,
          currency: "usd",
          destination: acct.stripe_account_id,
          transfer_group: r.order_id ?? undefined,
          metadata: { transaction_id: r.id, order_id: r.order_id ?? "", seller_id: r.seller_id },
        });
        await admin.from("transactions").update({ stripe_transfer_id: transfer.id }).eq("id", r.id);
        results.push({ id: r.id, transfer_id: transfer.id });
      } catch (err: any) {
        console.error("transfer failed", r.id, err.message);
        results.push({ id: r.id, error: err.message });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("stripe-auto-transfer", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
