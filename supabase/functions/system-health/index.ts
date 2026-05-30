import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const sendgridKey = Deno.env.get('SENDGRID_API_KEY') ?? Deno.env.get('RESEND_API_KEY');

  const supa = createClient(supabaseUrl, serviceKey);

  async function timed<T>(fn: () => Promise<T>): Promise<{ ok: boolean; ms: number; data?: T; error?: string }> {
    const t0 = Date.now();
    try { const data = await fn(); return { ok: true, ms: Date.now() - t0, data }; }
    catch (e: any) { return { ok: false, ms: Date.now() - t0, error: String(e?.message ?? e) }; }
  }

  // Supabase
  const sb = await timed(async () => {
    const { error } = await supa.from('profiles').select('id', { head: true, count: 'exact' }).limit(1);
    if (error) throw error;
  });

  // Stripe
  const stripe = stripeKey ? await timed(async () => {
    const r = await fetch('https://api.stripe.com/v1/balance', { headers: { Authorization: `Bearer ${stripeKey}` } });
    if (!r.ok) throw new Error(`stripe ${r.status}`);
    return { mode: stripeKey.startsWith('sk_live') ? 'live' : 'test' };
  }) : { ok: false, ms: 0, error: 'no key', data: { mode: 'test' } };

  // Anthropic
  const anthropic = anthropicKey ? await timed(async () => {
    const r = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
  }) : { ok: false, ms: 0, error: 'no key' };

  // Email
  const email = sendgridKey ? { ok: true, ms: 0 } : { ok: false, ms: 0, error: 'no key' };

  // Last events
  const { data: lastWebhook } = await supa.from('webhook_logs').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const { data: lastSearch } = await supa.from('ai_search_sessions').select('created_at').order('created_at', { ascending: false }).limit(1).maybeSingle();
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { count: webhookErrors } = await supa.from('webhook_logs').select('id', { head: true, count: 'exact' }).eq('status', 'error').gte('created_at', since);

  return new Response(JSON.stringify({
    supabase: { status: sb.ok ? 'connected' : 'down', latency_ms: sb.ms, last_checked: new Date().toISOString() },
    stripe: { status: stripe.ok ? 'live' : 'error', mode: (stripe as any).data?.mode ?? 'test', last_webhook_at: lastWebhook?.created_at ?? null, webhook_errors_24h: webhookErrors ?? 0 },
    anthropic: { status: anthropic.ok ? 'active' : 'error', last_search_at: lastSearch?.created_at ?? null, errors_24h: 0 },
    email: { status: email.ok ? 'connected' : 'error', sent_today: 0, last_sent_at: null },
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
