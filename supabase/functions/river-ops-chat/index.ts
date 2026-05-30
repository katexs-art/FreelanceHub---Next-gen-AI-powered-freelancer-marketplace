import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const SYSTEM_PROMPT = `You are River Ops, the AI co-founder and operations manager of Katexs, the world's first AI-native freelance marketplace. You work exclusively with Kevin the founder. You have access to real time platform data including all users orders revenue disputes seller performance and buyer activity. Your job is to help Kevin run the platform day to day. You give daily briefings when asked. You make revenue predictions based on current data. You flag problems before they become serious. You give direct opinions on sellers buyers and platform performance. You help resolve disputes by analyzing context. You monitor platform health and alert Kevin when something needs attention. You speak directly and confidently like a co-founder not like a customer service bot. You know this platform inside and out. You are always watching.`;

async function gatherContext() {
  const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0);
  const sod = startOfDay.toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();

  const [
    ordersToday, revenueToday, openDisputes, pendingApps,
    activeOrders, topSellersRaw, newSignups, riverSearches,
  ] = await Promise.all([
    admin.from("orders").select("id", { count: "exact", head: true }).gte("created_at", sod),
    admin.from("orders").select("platform_fee").gte("created_at", sod).eq("status", "completed"),
    admin.from("disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("seller_status", "pending_approval"),
    admin.from("orders").select("id", { count: "exact", head: true }).in("status", ["in_progress", "delivered", "pending_requirements", "pending_payment"]),
    admin.from("orders").select("seller_id").eq("status", "completed").gte("completed_at", weekAgo).limit(1000),
    admin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", sod),
    admin.from("buyer_searches").select("id", { count: "exact", head: true }).gte("created_at", sod),
  ]);

  const revenue = (revenueToday.data ?? []).reduce((s: number, r: any) => s + (r.platform_fee || 0), 0);

  const counts = new Map<string, number>();
  (topSellersRaw.data ?? []).forEach((r: any) => counts.set(r.seller_id, (counts.get(r.seller_id) || 0) + 1));
  const topIds = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topNames: string[] = [];
  if (topIds.length) {
    const { data: profs } = await admin.from("profiles").select("id, full_name, username").in("id", topIds.map((x) => x[0]));
    const nameMap = new Map((profs ?? []).map((p: any) => [p.id, p.full_name || p.username || p.id]));
    topIds.forEach(([id, n]) => topNames.push(`${nameMap.get(id) || id} (${n})`));
  }

  return {
    orders_today: ordersToday.count ?? 0,
    revenue_today_cents: revenue,
    open_disputes: openDisputes.count ?? 0,
    pending_seller_applications: pendingApps.count ?? 0,
    active_orders: activeOrders.count ?? 0,
    top_sellers_week: topNames,
    new_signups_today: newSignups.count ?? 0,
    river_searches_today: riverSearches.count ?? 0,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub;

    const { data: prof } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (prof?.role !== "admin") return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { messages, daily_briefing } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ctx = await gatherContext();
    const ctxBlock = `\n\nLive platform data (UTC, today so far):\n- Orders today: ${ctx.orders_today}\n- Revenue today (platform fees, cents): ${ctx.revenue_today_cents}\n- Open disputes: ${ctx.open_disputes}\n- Pending seller applications: ${ctx.pending_seller_applications}\n- Active orders: ${ctx.active_orders}\n- Top 5 sellers by completed orders this week: ${ctx.top_sellers_week.join(", ") || "none"}\n- New signups today: ${ctx.new_signups_today}\n- River searches today: ${ctx.river_searches_today}`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: SYSTEM_PROMPT + ctxBlock,
        messages: messages.map((m: any) => ({ role: m.role === "user" ? "user" : "assistant", content: String(m.content ?? "") })),
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: "anthropic error", details: txt }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await res.json();
    const reply = data?.content?.[0]?.text ?? "";

    const lastUser = [...messages].reverse().find((m: any) => m.role === "user");
    const inserts: any[] = [];
    if (lastUser) inserts.push({ user_id: userId, role: "user", message: String(lastUser.content ?? ""), daily_briefing: !!daily_briefing });
    inserts.push({ user_id: userId, role: "assistant", message: reply, daily_briefing: !!daily_briefing });
    await admin.from("river_ops_conversations").insert(inserts);

    return new Response(JSON.stringify({ reply, context: ctx }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("river-ops-chat", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
