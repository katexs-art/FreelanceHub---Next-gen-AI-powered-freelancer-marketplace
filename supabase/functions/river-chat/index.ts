import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEFAULT_PROMPT = `You are River, the matchmaking AI for KATEXS — a marketplace where buyers hire sellers for services (gigs).

Your job:
1. Ask 1-2 short clarifying questions if the user's request is vague (budget, timeline, scope).
2. Once you understand the project, recommend the best matching gigs from the list provided.
3. Keep replies short (max ~80 words). Friendly, sharp, no fluff. Never invent gigs.

When recommending, mention 1-3 gigs by title, their category, starting price, and rating. Refer to gigs by their title.`;

async function checkRateLimit(identifier: string, bucket: string, limit: number) {
  const windowMs = 60_000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();
  const { data: existing } = await supabase.from("rate_limits").select("id,count")
    .eq("bucket", bucket).eq("identifier", identifier).eq("window_start", windowStart).maybeSingle();
  if (existing) {
    if (existing.count >= limit) return false;
    await supabase.from("rate_limits").update({ count: existing.count + 1 }).eq("id", existing.id);
  } else {
    await supabase.from("rate_limits").insert({ bucket, identifier, window_start: windowStart, count: 1 });
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Rate limit: 15/min per user or IP
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await userClient.auth.getUser();
      userId = data.user?.id ?? null;
    }
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
    const identifier = userId ?? `ip:${ip}`;
    if (!(await checkRateLimit(identifier, 'river-chat', 15))) {
      return new Response(JSON.stringify({ error: 'rate limit exceeded' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch live, active gigs to ground the model
    const { data: gigs } = await supabase
      .from('gigs')
      .select('id, title, category, subcategory, starting_price, average_rating, total_reviews, total_orders, seller_id')
      .eq('status', 'active')
      .order('total_orders', { ascending: false })
      .limit(30);

    // Resolve seller names for context
    const sellerIds = [...new Set((gigs ?? []).map((g: any) => g.seller_id))];
    const { data: sellers } = sellerIds.length
      ? await supabase.from('profiles').select('id, full_name, username').in('id', sellerIds)
      : { data: [] as any };
    const sellerById = new Map((sellers ?? []).map((s: any) => [s.id, s]));

    // Load custom system prompt if admin set one
    const { data: settings } = await supabase
      .from('platform_settings').select('value').eq('key', 'river_system_prompt').maybeSingle();
    const basePrompt = (settings as any)?.value || DEFAULT_PROMPT;

    const gigList = (gigs ?? []).map((g: any) => {
      const s = sellerById.get(g.seller_id);
      const name = s?.full_name || s?.username || 'Seller';
      const cat = [g.category, g.subcategory].filter(Boolean).join(' / ') || 'general';
      return `- "${g.title}" (${g.id}) — ${cat} · by ${name} · from $${g.starting_price ?? 0} · ★${g.average_rating ?? 0} (${g.total_reviews ?? 0} reviews) · ${g.total_orders ?? 0} orders`;
    }).join('\n') || '- (no gigs available yet)';

    const system = `${basePrompt}\n\nAvailable gigs:\n${gigList}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 400,
        messages: [
          { role: 'system', content: system },
          ...messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: String(m.content ?? ''),
          })),
        ],
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded, please try again shortly.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }), {
        status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: 'AI gateway error', details: txt }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
