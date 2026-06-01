import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests } from '../_shared/rate-limit.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const SYSTEM_PROMPT = `You are River, the AI assistant for Katexs — the world's first AI freelance marketplace. You help buyers find AI experts and help sellers grow their business. Be concise, warm, and helpful. When a user describes what they need, search the available services and recommend specific experts. Keep responses under 100 words unless explaining something complex. Never make up expert names or prices — only reference real data provided to you.

When recommending an expert from the list provided, embed them inline using exactly this format on its own line:
[EXPERT_CARD: gig_id]
The UI will render a card. Only use IDs from the provided list. Max 3 cards per reply.`;

const STOPWORDS = new Set([
  'the','and','for','with','that','this','from','have','you','your','what','need','want','looking','please','help',
  'how','who','can','will','are','was','were','our','out','any','one','two','some','more','than','they','them',
]);

function tokenize(s: string): string[] {
  return Array.from(new Set(
    s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  )).slice(0, 8);
}

const FALLBACK_REPLY = "I'm taking a quick break. Please try again in a moment.";

function sseLine(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(obj)}\n\n`);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  // --- Auth (required) ---
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.slice(7);
  const { data: claimsData, error: claimsErr } = await admin.auth.getClaims(token);
  if (claimsErr || !claimsData?.claims?.sub) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const userId = claimsData.claims.sub as string;

  // --- Input ---
  let body: { message?: string; history?: { role: string; content: string }[]; context?: unknown };
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const message = String(body.message ?? '').trim();
  if (message.length < 3) {
    return new Response(JSON.stringify({ error: 'Message too short' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const history = Array.isArray(body.history)
    ? body.history.filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string').slice(-20)
    : [];

  // --- Rate limit ---
  if (!(await checkRateLimit(admin, { bucket: 'river-chat', identifier: `user:${userId}`, limit: 15 }))) {
    return tooManyRequests(corsHeaders);
  }

  // --- Gig retrieval (keyword grounding) ---
  const tokens = tokenize(message);
  let gigs: any[] = [];
  if (tokens.length) {
    const orFilters = tokens.flatMap((t) => [`title.ilike.%${t}%`, `description.ilike.%${t}%`]).join(',');
    const { data } = await admin
      .from('gigs')
      .select('id,title,description,category,subcategory,starting_price,average_rating,total_reviews,total_orders,seller_id,slug')
      .eq('status', 'active')
      .or(orFilters)
      .order('total_orders', { ascending: false })
      .limit(3);
    gigs = data ?? [];
  }
  if (gigs.length === 0) {
    const { data } = await admin
      .from('gigs')
      .select('id,title,description,category,subcategory,starting_price,average_rating,total_reviews,total_orders,seller_id,slug')
      .eq('status', 'active')
      .order('total_orders', { ascending: false })
      .limit(3);
    gigs = data ?? [];
  }
  const sellerIds = [...new Set(gigs.map((g) => g.seller_id))];
  const { data: sellers } = sellerIds.length
    ? await admin.from('profiles').select('id,full_name,username').in('id', sellerIds)
    : { data: [] as any };
  const sellerById = new Map((sellers ?? []).map((s: any) => [s.id, s]));

  const gigList = gigs.length
    ? gigs.map((g) => {
        const s = sellerById.get(g.seller_id);
        const name = s?.full_name || s?.username || 'Seller';
        const cat = [g.category, g.subcategory].filter(Boolean).join(' / ') || 'general';
        return `- id=${g.id} | "${g.title}" — ${cat} · by ${name} · from $${g.starting_price ?? 0} · ★${g.average_rating ?? 0} (${g.total_reviews ?? 0})`;
      }).join('\n')
    : '- (no active experts available right now)';

  const system = `${SYSTEM_PROMPT}\n\nAvailable experts (use the id when emitting [EXPERT_CARD: id]):\n${gigList}`;

  // Pre-resolve cards keyed by id so we can attach them on the way out
  const cardById = new Map<string, any>(gigs.map((g) => {
    const s = sellerById.get(g.seller_id);
    return [g.id, {
      id: g.id,
      slug: g.slug ?? g.id,
      title: g.title,
      category: [g.category, g.subcategory].filter(Boolean).join(' · '),
      price: g.starting_price ?? 0,
      rating: Number(g.average_rating ?? 0),
      reviews: g.total_reviews ?? 0,
      seller_name: s?.full_name || s?.username || 'Seller',
      seller_username: s?.username ?? null,
    }];
  }));

  // --- Call Anthropic streaming ---
  let anthropicRes: Response;
  try {
    anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 600,
        stream: true,
        system,
        messages: [
          ...history.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
      }),
    });
  } catch (_e) {
    const stream = new ReadableStream({
      start(c) { c.enqueue(sseLine({ delta: FALLBACK_REPLY })); c.enqueue(sseLine({ done: true, cards: [] })); c.close(); },
    });
    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  }

  if (!anthropicRes.ok || !anthropicRes.body) {
    const stream = new ReadableStream({
      start(c) { c.enqueue(sseLine({ delta: FALLBACK_REPLY })); c.enqueue(sseLine({ done: true, cards: [] })); c.close(); },
    });
    return new Response(stream, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
  }

  // Transform Anthropic SSE → our SSE { delta } / { done, cards }
  const reader = anthropicRes.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';

  const out = new ReadableStream({
    async pull(controller) {
      try {
        const { done, value } = await reader.read();
        if (done) {
          // Resolve [EXPERT_CARD: id] tokens from accumulated text
          const ids = Array.from(new Set(
            [...fullText.matchAll(/\[EXPERT_CARD:\s*([0-9a-f-]{8,})\s*\]/gi)].map((m) => m[1])
          ));
          const cards = ids.map((id) => cardById.get(id)).filter(Boolean);
          controller.enqueue(sseLine({ done: true, cards }));
          controller.close();
          return;
        }
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (!json || json === '[DONE]') continue;
          try {
            const evt = JSON.parse(json);
            if (evt.type === 'content_block_delta' && evt.delta?.type === 'text_delta') {
              const text = evt.delta.text as string;
              fullText += text;
              controller.enqueue(sseLine({ delta: text }));
            }
          } catch { /* ignore partial */ }
        }
      } catch (_e) {
        controller.enqueue(sseLine({ delta: FALLBACK_REPLY }));
        controller.enqueue(sseLine({ done: true, cards: [] }));
        controller.close();
      }
    },
    cancel() { try { reader.cancel(); } catch { /* noop */ } },
  });

  return new Response(out, {
    headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  });
});
