import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { checkRateLimit, tooManyRequests } from "../_shared/rate-limit.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const SYSTEM_PROMPT = `You are River, an AI matching engine for Katexs, the world's first AI-native freelance marketplace. When a buyer describes what they need you analyze their request and identify the most important skills, tools, categories, and expertise required. You return ONLY a JSON object with these fields — required_skills as an array of strings, category as a string matching our platform categories, budget_signal as low medium or high, urgency_signal as low medium or high, and match_summary as one sentence describing the ideal seller for this job. Return only valid JSON with no additional text or markdown.`;

type Signals = {
  required_skills: string[];
  category: string;
  budget_signal: "low" | "medium" | "high";
  urgency_signal: "low" | "medium" | "high";
  match_summary: string;
};

async function callAI(query: string): Promise<Signals> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      max_tokens: 400,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: query },
      ],
    }),
  });
  if (!res.ok) throw new Error(`ai gateway ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = data?.choices?.[0]?.message?.content ?? "{}";
  const jsonStr = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(jsonStr);
  return {
    required_skills: Array.isArray(parsed.required_skills) ? parsed.required_skills.map(String) : [],
    category: String(parsed.category ?? ""),
    budget_signal: parsed.budget_signal ?? "medium",
    urgency_signal: parsed.urgency_signal ?? "medium",
    match_summary: String(parsed.match_summary ?? ""),
  };
}

function norm(s: string) { return s.toLowerCase().trim(); }

async function checkRateLimit(identifier: string, limit: number) {
  const windowMs = 60_000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const { data: existing } = await supabase.from("rate_limits").select("id,count")
    .eq("bucket", "river-public-match").eq("identifier", identifier).eq("window_start", windowStart).maybeSingle();
  if (existing) {
    if (existing.count >= limit) return false;
    await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await supabase.from("rate_limits").insert({ bucket: "river-public-match", identifier, window_start: windowStart, count: 1 });
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (query.length > 1000) {
      return new Response(JSON.stringify({ error: "query too long" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 10/min per IP (no auth required on this endpoint)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (!(await checkRateLimit(`ip:${ip}`, 10))) {
      return new Response(JSON.stringify({ error: "rate limit exceeded" }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let signals: Signals;
    try {
      signals = await callAI(query);
    } catch (e) {
      console.warn("ai fallback", (e as Error).message);
      signals = { required_skills: [], category: "", budget_signal: "medium", urgency_signal: "medium", match_summary: "" };
    }

    const skillSet = new Set(signals.required_skills.map(norm));
    const catNorm = norm(signals.category);

    const { data: gigs } = await supabase
      .from("gigs")
      .select("seller_id,title,description,category,subcategory,tags,starting_price,average_rating,total_reviews,total_orders")
      .eq("status", "active")
      .limit(1000);

    const sellerIds = [...new Set((gigs ?? []).map((g: any) => g.seller_id))];
    if (!sellerIds.length) {
      return new Response(JSON.stringify({ signals, sellers: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id,username,full_name,avatar_url,bio,response_time_minutes,river_score,seller_skills,primary_category,seller_status")
      .in("id", sellerIds)
      .eq("seller_status", "approved");

    const byId = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => {
      byId.set(p.id, {
        id: p.id, username: p.username, full_name: p.full_name, avatar_url: p.avatar_url,
        bio: p.bio, response_time_minutes: p.response_time_minutes,
        average_rating: 0, total_reviews: 0, total_orders: 0,
        starting_price: null, tags: [] as string[], categories: [] as string[],
        riverScore: Number(p.river_score ?? 0),
        sellerSkills: (p.seller_skills ?? []) as string[],
        primaryCategory: p.primary_category ?? "",
        matchScore: 0,
      });
    });

    (gigs ?? []).forEach((g: any) => {
      const s = byId.get(g.seller_id);
      if (!s) return;
      s.total_reviews += g.total_reviews || 0;
      s.total_orders += g.total_orders || 0;
      s.average_rating = Math.max(s.average_rating, Number(g.average_rating) || 0);
      if (g.starting_price && (s.starting_price === null || g.starting_price < s.starting_price)) s.starting_price = g.starting_price;
      (g.tags || []).forEach((t: string) => { if (!s.tags.includes(t)) s.tags.push(t); });
      if (g.category && !s.categories.includes(g.category)) s.categories.push(g.category);

      // skill matches against gig text + tags
      const hay = [g.title, g.description, g.category, g.subcategory, (g.tags || []).join(" ")].filter(Boolean).join(" ").toLowerCase();
      skillSet.forEach((sk) => { if (hay.includes(sk)) s.matchScore += 3; });
      if (catNorm && norm(g.category || "") === catNorm) s.matchScore += 5;
    });

    const list = Array.from(byId.values()).map((s) => {
      // profile-level boosts
      s.sellerSkills.forEach((sk: string) => { if (skillSet.has(norm(sk))) s.matchScore += 3; });
      if (catNorm && norm(s.primaryCategory) === catNorm) s.matchScore += 5;
      s.matchScore += (s.riverScore || 0) / 20;
      s.matchScore += (s.average_rating || 0);
      s.matchScore += Math.min(5, (s.total_orders || 0) / 10);
      return s;
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 15);

    return new Response(JSON.stringify({ signals, sellers: list }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("river-public-match", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
