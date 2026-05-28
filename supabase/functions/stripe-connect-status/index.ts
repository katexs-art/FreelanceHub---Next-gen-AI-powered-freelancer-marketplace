// Refreshes a seller's connected-account status from Stripe and updates seller_accounts.
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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-11-20.acacia" });

    const { data: acct } = await admin.from("seller_accounts").select("*").eq("seller_id", user.id).maybeSingle();
    if (!acct?.stripe_account_id) {
      return new Response(JSON.stringify({ connected: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const account = await stripe.accounts.retrieve(acct.stripe_account_id);
    const onboarding_complete = !!account.details_submitted;
    const charges_enabled = !!account.charges_enabled;
    const payouts_enabled = !!account.payouts_enabled;

    await admin.from("seller_accounts").update({
      onboarding_complete, charges_enabled, payouts_enabled,
    }).eq("seller_id", user.id);

    return new Response(JSON.stringify({
      connected: true, onboarding_complete, charges_enabled, payouts_enabled,
      requirements: account.requirements,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("stripe-connect-status", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
