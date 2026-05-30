// AI-powered search: takes a natural-language query and returns
// a refined query, suggested categories, budget/delivery filters, and ranked gig IDs.
// Logs every session to ai_search_sessions.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { checkRateLimit, tooManyRequests } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CATEGORIES = [
  "Voice AI", "AI Automation", "Programming & Tech", "Graphics & Design",
  "Digital Marketing", "Writing & Translation", "Video & Animation", "Music & Audio",
];

interface AIResult {
  refined_query: string;
  suggested_categories: string[];
  budget_filter?: string | null;
  delivery_filter?: string | null;
  confidence: number;
}

async function callLovableAI(query: string): Promise<AIResult> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

  const system = `You parse a buyer's natural-language search into structured filters for a freelance marketplace.
Categories: ${CATEGORIES.join(", ")}.
Respond ONLY with valid JSON of shape:
{"refined_query": string, "suggested_categories": string[] (0-3 from list), "budget_filter": "under_50"|"50_200"|"200_1000"|"over_1000"|null, "delivery_filter": "24h"|"3d"|"7d"|null, "confidence": number 0-1}.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        { role: "user", content: query },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) throw new Error(`AI gateway ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content);
  return {
    refined_query: parsed.refined_query ?? query,
    suggested_categories: Array.isArray(parsed.suggested_categories) ? parsed.suggested_categories.slice(0, 3) : [],
    budget_filter: parsed.budget_filter ?? null,
    delivery_filter: parsed.delivery_filter ?? null,
    confidence: Number(parsed.confidence ?? 0.5),
  };
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, session_id } = await req.json();
    if (!query || typeof query !== "string") throw new Error("query required");
    if (query.length > 500) throw new Error("query too long");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Optional user from JWT
    let user_id: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const userClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data } = await userClient.auth.getUser();
      user_id = data.user?.id ?? null;
    }

    // Rate limit: 20/min per user or per IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const identifier = user_id ?? `ip:${ip}`;
    if (!(await checkRateLimit(admin, { bucket: "ai-search", identifier, limit: 20 }))) {
      return tooManyRequests(corsHeaders);
    }

    let ai: AIResult;
    try {
      ai = await callLovableAI(query);
    } catch (e) {
      console.warn("AI fallback:", (e as Error).message);
      ai = { refined_query: query, suggested_categories: [], confidence: 0.2 };
    }

    // Build the gigs query using refined query + filters
    let q = admin.from("gigs")
      .select("id,title,thumbnail_url,starting_price,average_rating,total_reviews,seller_id,total_orders,category")
      .eq("status", "active");

    if (ai.refined_query) {
      q = q.textSearch("search_vector", ai.refined_query, { type: "websearch", config: "english" });
    }
    if (ai.suggested_categories.length) {
      q = q.in("category", ai.suggested_categories);
    }
    if (ai.budget_filter === "under_50") q = q.lt("starting_price", 50);
    else if (ai.budget_filter === "50_200") q = q.gte("starting_price", 50).lte("starting_price", 200);
    else if (ai.budget_filter === "200_1000") q = q.gte("starting_price", 200).lte("starting_price", 1000);
    else if (ai.budget_filter === "over_1000") q = q.gt("starting_price", 1000);

    q = q.order("total_orders", { ascending: false }).limit(36);
    const { data: gigs } = await q;
    const gig_ids = (gigs ?? []).map((g) => g.id);

    // Log session
    await admin.from("ai_search_sessions").insert({
      user_id,
      session_id: session_id ?? null,
      query,
      refined_query: ai.refined_query,
      suggested_categories: ai.suggested_categories,
      budget_filter: ai.budget_filter,
      delivery_filter: ai.delivery_filter,
      confidence: ai.confidence,
      result_gig_ids: gig_ids,
    });

    return new Response(JSON.stringify({
      refined_query: ai.refined_query,
      suggested_categories: ai.suggested_categories,
      budget_filter: ai.budget_filter,
      delivery_filter: ai.delivery_filter,
      confidence: ai.confidence,
      gigs: gigs ?? [],
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("ai-search error", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
