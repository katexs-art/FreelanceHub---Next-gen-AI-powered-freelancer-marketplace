// Creates a Stripe Checkout Session for a service purchase.
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

    const { service_id, description } = await req.json();
    if (!service_id) throw new Error("service_id required");

    // Fetch service + expert details using service role to bypass RLS guarantees
    const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: service, error: svcErr } = await admin
      .from("services")
      .select("id, title, price, expert_id, is_active")
      .eq("id", service_id)
      .maybeSingle();

    if (svcErr || !service || !service.is_active) throw new Error("Service unavailable");
    if (service.expert_id === user.id) throw new Error("You cannot purchase your own service");

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const origin = req.headers.get("origin") || "https://katexs.com";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: service.title },
            unit_amount: service.price * 100,
          },
          quantity: 1,
        },
      ],
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/expert/${service.expert_id}`,
      customer_email: user.email ?? undefined,
      metadata: {
        service_id: service.id,
        client_id: user.id,
        expert_id: service.expert_id,
        price: String(service.price),
        description: description ?? "",
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
