// Creates a Stripe Express connected account for the signed-in seller (if missing)
// and returns an onboarding account link URL.
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
    if (!acct) throw new Error("No seller account — sign up as a seller first");

    let stripeId = acct.stripe_account_id as string | null;
    if (!stripeId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: user.email,
        capabilities: { transfers: { requested: true }, card_payments: { requested: true } },
        business_type: "individual",
      });
      stripeId = account.id;
      await admin.from("seller_accounts").update({ stripe_account_id: stripeId }).eq("seller_id", user.id);
    }

    const origin = req.headers.get("origin") || `https://${Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0]}.lovable.app`;
    const link = await stripe.accountLinks.create({
      account: stripeId,
      refresh_url: `${origin}/seller/earnings?connect=refresh`,
      return_url: `${origin}/seller/earnings?connect=return`,
      type: "account_onboarding",
    });

    return new Response(JSON.stringify({ url: link.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-connect-onboard", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
