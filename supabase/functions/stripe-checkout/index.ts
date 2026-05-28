// Creates a Stripe Checkout Session for a gig package purchase.
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
    if (!authHeader) throw new Error("Missing authorization header");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData.user) throw new Error("Unauthenticated");
    const user = userData.user;

    const { package_id, extra_ids = [] } = await req.json();
    if (!package_id) throw new Error("package_id required");

    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: pkg, error: pkgErr } = await admin
      .from("gig_packages")
      .select("id, price, delivery_days, title, package_type, gig_id, gigs!inner(id, title, seller_id, status)")
      .eq("id", package_id)
      .maybeSingle();
    if (pkgErr || !pkg) throw new Error("Package not found");
    const gig: any = (pkg as any).gigs;
    if (gig.status !== "active") throw new Error("Gig is not active");
    if (gig.seller_id === user.id) throw new Error("You can't purchase your own gig");

    let extrasTotal = 0;
    let extraDays = 0;
    const lineItems: any[] = [{
      price_data: {
        currency: "usd",
        product_data: { name: `${gig.title} — ${pkg.package_type}` },
        unit_amount: pkg.price * 100,
      },
      quantity: 1,
    }];

    if (extra_ids.length) {
      const { data: extras } = await admin
        .from("gig_extras")
        .select("id, title, price, extra_delivery_days, gig_id")
        .in("id", extra_ids)
        .eq("gig_id", gig.id);
      for (const e of extras ?? []) {
        extrasTotal += e.price;
        extraDays += e.extra_delivery_days ?? 0;
        lineItems.push({
          price_data: {
            currency: "usd",
            product_data: { name: `Extra: ${e.title}` },
            unit_amount: e.price * 100,
          },
          quantity: 1,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });
    const origin = req.headers.get("origin") || "https://katexs.com";

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: lineItems,
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/gig/${gig.id}`,
      customer_email: user.email ?? undefined,
      metadata: {
        gig_id: gig.id,
        package_id: pkg.id,
        buyer_id: user.id,
        seller_id: gig.seller_id,
        price: String(pkg.price + extrasTotal),
        delivery_days: String(pkg.delivery_days + extraDays),
        extra_ids: JSON.stringify(extra_ids),
      },
    });

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("stripe-checkout error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
