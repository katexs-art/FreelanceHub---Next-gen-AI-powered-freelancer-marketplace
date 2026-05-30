// Refreshes Stripe Connect account flags for the authenticated seller.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Unauthenticated");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acct } = await admin.from("seller_accounts").select("stripe_account_id").eq("seller_id", u.user.id).maybeSingle();
    if (!acct?.stripe_account_id) {
      return new Response(JSON.stringify({ charges_enabled: false, payouts_enabled: false, onboarding_complete: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });
    const a = await stripe.accounts.retrieve(acct.stripe_account_id);
    await admin.from("seller_accounts").update({
      charges_enabled: a.charges_enabled,
      payouts_enabled: a.payouts_enabled,
      onboarding_complete: a.details_submitted,
    }).eq("seller_id", u.user.id);

    return new Response(JSON.stringify({
      charges_enabled: a.charges_enabled,
      payouts_enabled: a.payouts_enabled,
      onboarding_complete: a.details_submitted,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
