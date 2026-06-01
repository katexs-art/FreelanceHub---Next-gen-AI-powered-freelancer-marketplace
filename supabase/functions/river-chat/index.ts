import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests } from '../_shared/rate-limit.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEFAULT_PROMPT = `You are River, the AI assistant for Katexs — the world's first AI freelance marketplace. You help buyers find the perfect AI expert and help sellers grow their business. You are helpful, fast, and knowledgeable about AI services. Keep responses concise and actionable.

When recommending an expert or service from the list provided, embed them inline using this exact format on its own line:
[EXPERT_CARD: gig_id]
The UI will render the card automatically. Do not invent gig IDs — only use IDs from the provided list. You can include up to 3 cards per reply.

Tone: friendly, sharp, no fluff. Keep replies under ~120 words. Never invent gigs or prices.`;


Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Identify user (optional) for rate limit + seller context
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
    if (!(await checkRateLimit(supabase, { bucket: 'river-chat', identifier, limit: 15 }))) {
      return tooManyRequests(corsHeaders);
    }

    // Pull top live gigs to ground recommendations
    const { data: gigs } = await supabase
      .from('gigs')
      .select('id, title, category, subcategory, starting_price, average_rating, total_reviews, total_orders, seller_id')
      .eq('status', 'active')
      .order('total_orders', { ascending: false })
      .limit(40);

    const sellerIds = [...new Set((gigs ?? []).map((g: any) => g.seller_id))];
    const { data: sellers } = sellerIds.length
      ? await supabase.from('profiles').select('id, full_name, username').in('id', sellerIds)
      : { data: [] as any };
    const sellerById = new Map((sellers ?? []).map((s: any) => [s.id, s]));

    // Seller-mode context: if the caller is a seller, surface their stats
    let sellerContext = '';
    if (userId) {
      const { data: me } = await supabase
        .from('profiles')
        .select('role, full_name, seller_status')
        .eq('id', userId)
        .maybeSingle();
      if ((me as any)?.seller_status === 'approved') {
        const [{ data: acct }, { count: activeOrders }, { data: myGigs }] = await Promise.all([
          supabase.from('seller_accounts').select('available_balance, pending_balance, lifetime_earnings').eq('seller_id', userId).maybeSingle(),
          supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', userId).in('status', ['in_progress', 'delivered', 'revision_requested'] as any),
          supabase.from('gigs').select('id,title,impressions,total_orders,average_rating').eq('seller_id', userId),
        ]);
        const earnings = Math.round(((acct as any)?.lifetime_earnings ?? 0) / 100);
        const avail = Math.round(((acct as any)?.available_balance ?? 0) / 100);
        const gigLines = (myGigs ?? []).slice(0, 5).map((g: any) =>
          `  • ${g.title} — ${g.impressions ?? 0} views · ${g.total_orders ?? 0} orders · ★${g.average_rating ?? 0}`,
        ).join('\n');
        sellerContext = `\n\nThe user is a Katexs seller. Their live stats:
- Lifetime earnings: $${earnings}
- Available to withdraw: $${avail}
- Active orders: ${activeOrders ?? 0}
- Their services:\n${gigLines || '  • (none yet)'}\n`;
      }
    }

    // Load custom system prompt if admin set one
    const { data: settings } = await supabase
      .from('platform_settings').select('value').eq('key', 'river_system_prompt').maybeSingle();
    const basePrompt = (settings as any)?.value || DEFAULT_PROMPT;

    const gigList = (gigs ?? []).map((g: any) => {
      const s = sellerById.get(g.seller_id);
      const name = s?.full_name || s?.username || 'Seller';
      const cat = [g.category, g.subcategory].filter(Boolean).join(' / ') || 'general';
      return `- id=${g.id} | "${g.title}" — ${cat} · by ${name} · from $${g.starting_price ?? 0} · ★${g.average_rating ?? 0} (${g.total_reviews ?? 0} reviews) · ${g.total_orders ?? 0} orders`;
    }).join('\n') || '- (no gigs available yet)';

    const system = `${basePrompt}${sellerContext}\n\nAvailable experts / gigs (use the id when emitting [EXPERT_CARD: id]):\n${gigList}`;

    const res = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        max_tokens: 500,
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

    // Resolve any [EXPERT_CARD: id] references to compact card payloads the UI can render
    const ids = Array.from(new Set([...reply.matchAll(/\[EXPERT_CARD:\s*([0-9a-f-]{8,})\s*\]/gi)].map((m) => m[1])));
    let cards: any[] = [];
    if (ids.length) {
      const matched = (gigs ?? []).filter((g: any) => ids.includes(g.id));
      cards = matched.map((g: any) => {
        const s = sellerById.get(g.seller_id);
        return {
          id: g.id,
          title: g.title,
          category: [g.category, g.subcategory].filter(Boolean).join(' · '),
          price: g.starting_price ?? 0,
          rating: Number(g.average_rating ?? 0),
          reviews: g.total_reviews ?? 0,
          seller_name: s?.full_name || s?.username || 'Seller',
          seller_username: s?.username ?? null,
        };
      });
    }

    return new Response(JSON.stringify({ reply, cards }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
