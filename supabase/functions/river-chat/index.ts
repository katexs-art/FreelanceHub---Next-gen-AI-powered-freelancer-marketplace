import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const DEFAULT_PROMPT = `You are River, the matchmaking AI for Katexs — the AI-only marketplace for GoHighLevel & AI experts.

Your job:
1. Ask 1-2 short clarifying questions if the user's request is vague (budget, timeline, scope).
2. Once you understand the project, recommend the top experts from the list provided.
3. Keep replies short (max ~80 words). Friendly, sharp, no fluff. Never invent experts.

When recommending, mention 1-3 experts by name, their specialty, starting price, and rating.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { messages, sessionId } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch live experts to ground the model
    const { data: experts } = await supabase
      .from('experts')
      .select('id, specialty, bio, starting_price, rating, total_jobs, response_time, profiles!inner(full_name)')
      .eq('status', 'active')
      .order('rating', { ascending: false })
      .limit(20);

    // Load custom system prompt if admin set one
    const { data: settings } = await supabase
      .from('platform_settings').select('value').eq('key', 'river_system_prompt').maybeSingle();
    const basePrompt = (settings?.value as any)?.prompt || DEFAULT_PROMPT;

    const expertList = (experts ?? []).map((e: any) => {
      const name = e.profiles?.full_name || 'Expert';
      return `- ${name} (${e.id}) — ${e.specialty || 'general'} · from $${e.starting_price ?? 0} · ★${e.rating ?? 0} · ${e.total_jobs ?? 0} jobs`;
    }).join('\n') || '- (no experts available yet)';

    const system = `${basePrompt}\n\nAvailable experts:\n${expertList}`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 400,
        system,
        messages: messages.map((m: any) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content ?? ''),
        })),
      }),
    });

    if (!res.ok) {
      const txt = await res.text();
      return new Response(JSON.stringify({ error: 'Anthropic error', details: txt }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const data = await res.json();
    const reply = data.content?.[0]?.text ?? '';

    // Persist session (best-effort)
    try {
      const updatedMessages = [...messages, { role: 'assistant', content: reply }];
      if (sessionId) {
        await supabase.from('river_sessions').update({ messages: updatedMessages }).eq('id', sessionId);
      } else {
        const { data: created } = await supabase
          .from('river_sessions')
          .insert({ messages: updatedMessages })
          .select('id').single();
        return new Response(JSON.stringify({ reply, sessionId: created?.id }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } catch (_) { /* ignore logging errors */ }

    return new Response(JSON.stringify({ reply, sessionId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Internal error', details: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
