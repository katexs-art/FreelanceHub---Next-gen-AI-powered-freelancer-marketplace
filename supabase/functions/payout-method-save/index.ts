// Saves a seller's payout method (Stripe bank or PayPal). For stripe_bank we
// create/update a Stripe Custom connected account using a tokenized external
// account from Stripe.js — no hosted onboarding required.
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

    const body = await req.json();
    const method = body.method as "stripe_bank" | "paypal";
    if (method !== "stripe_bank" && method !== "paypal") throw new Error("Invalid method");

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: acct } = await admin.from("seller_accounts").select("*").eq("seller_id", user.id).maybeSingle();
    if (!acct) {
      await admin.from("seller_accounts").insert({ seller_id: user.id });
    }

    const update: any = { payout_method: method, payouts_enabled: false };

    if (method === "paypal") {
      const email = String(body.paypal_email ?? "").trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Valid PayPal email required");
      update.paypal_email = email;
      // Do NOT auto-enable payouts: PayPal email must be admin-verified before
      // it can receive funds, otherwise anyone could redirect payouts to an
      // arbitrary address.
      update.payouts_enabled = false;
    } else {
      // stripe_bank
      const country = String(body.country ?? "").toUpperCase();
      const bank_token = String(body.bank_token ?? "");
      if (!country || country.length !== 2) throw new Error("country (ISO-2) required");
      if (!bank_token.startsWith("btok_")) throw new Error("bank_token required (from Stripe.js)");

      const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2024-06-20" });
      let stripeAccountId = acct?.stripe_account_id as string | null;

      if (!stripeAccountId) {
        const account = await stripe.accounts.create({
          type: "custom",
          country,
          email: user.email ?? undefined,
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          tos_acceptance: { service_agreement: "recipient" },
          metadata: { seller_id: user.id },
          external_account: bank_token,
        });
        stripeAccountId = account.id;
      } else {
        await stripe.accounts.update(stripeAccountId, { external_account: bank_token });
      }

      const account = await stripe.accounts.retrieve(stripeAccountId);
      const ext = (account.external_accounts?.data?.[0] as any);
      update.stripe_account_id = stripeAccountId;
      update.bank_country = country;
      update.bank_last4 = ext?.last4 ?? null;
      update.charges_enabled = !!account.charges_enabled;
      update.payouts_enabled = !!account.payouts_enabled || !!account.capabilities?.transfers;
      update.onboarding_complete = true;
    }

    await admin.from("seller_accounts").update(update).eq("seller_id", user.id);

    return new Response(JSON.stringify({ ok: true, ...update }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("payout-method-save", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
