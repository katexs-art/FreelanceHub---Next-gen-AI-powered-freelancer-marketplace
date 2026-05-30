// Create or refresh a Stripe Connect Express account link for the seller.
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
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-04-30.basil" });

    const { return_url } = await req.json();
    const baseUrl = return_url || "https://katexs.lovable.app/seller/earnings";

    let { data: acct } = await admin.from("seller_accounts").select("*").eq("seller_id", u.user.id).maybeSingle();
    if (!acct) {
      await admin.from("seller_accounts").insert({ seller_id: u.user.id });
      acct = (await admin.from("seller_accounts").select("*").eq("seller_id", u.user.id).maybeSingle()).data;
    }

    let stripeAccountId = acct?.stripe_account_id as string | null;
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: u.user.email,
        capabilities: { transfers: { requested: true } },
      });
      stripeAccountId = account.id;
      await admin.from("seller_accounts").update({ stripe_account_id: stripeAccountId, payout_method: "stripe" }).eq("seller_id", u.user.id);
    }

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: baseUrl,
      return_url: baseUrl,
      type: "account_onboarding",
    });

    // Sync flags
    const a = await stripe.accounts.retrieve(stripeAccountId);
    await admin.from("seller_accounts").update({
      charges_enabled: a.charges_enabled,
      payouts_enabled: a.payouts_enabled,
      onboarding_complete: a.details_submitted,
    }).eq("seller_id", u.user.id);

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
