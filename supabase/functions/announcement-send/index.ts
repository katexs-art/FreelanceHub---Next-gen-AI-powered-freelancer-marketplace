import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const auth = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: auth } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc('is_admin', { user_id: user.id }).single();
    if (!isAdmin) return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const body = await req.json();
    const { announcement_id } = body;
    const { data: ann, error } = await admin.from('announcements').select('*').eq('id', announcement_id).single();
    if (error || !ann) throw new Error('announcement not found');

    let recipientQuery = admin.from('profiles').select('id');
    if (ann.audience === 'buyers') recipientQuery = recipientQuery.eq('role', 'client');
    else if (ann.audience === 'sellers') recipientQuery = recipientQuery.eq('role', 'seller');
    else if (ann.audience?.startsWith('category:')) recipientQuery = recipientQuery.eq('role', 'seller').eq('primary_category', ann.audience.split(':')[1]);
    const { data: recipients } = await recipientQuery;

    if (recipients && recipients.length) {
      const rows = recipients.map((r: any) => ({
        user_id: r.id, type: 'system' as any, title: ann.title, body: ann.body, link: '/',
      }));
      // batch insert in chunks of 500 via service role
      for (let i = 0; i < rows.length; i += 500) {
        await admin.from('notifications').insert(rows.slice(i, i + 500) as any);
      }
    }

    await admin.from('announcements').update({ sent_at: new Date().toISOString(), recipient_count: recipients?.length ?? 0 }).eq('id', announcement_id);
    return new Response(JSON.stringify({ ok: true, recipients: recipients?.length ?? 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: String(e?.message ?? e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
