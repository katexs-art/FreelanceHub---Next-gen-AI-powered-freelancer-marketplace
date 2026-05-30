
-- featured sellers
CREATE TABLE IF NOT EXISTS public.featured_sellers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL UNIQUE,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.featured_sellers TO anon, authenticated;
GRANT ALL ON public.featured_sellers TO service_role;
ALTER TABLE public.featured_sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY fs_public_read ON public.featured_sellers FOR SELECT USING (true);
CREATE POLICY fs_admin_write ON public.featured_sellers FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

-- announcements
CREATE TABLE IF NOT EXISTS public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  scheduled_for timestamptz,
  sent_at timestamptz,
  created_by uuid NOT NULL,
  recipient_count int NOT NULL DEFAULT 0,
  open_count int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ann_admin_all ON public.announcements FOR ALL
  USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE POLICY ann_user_read_sent ON public.announcements FOR SELECT
  USING (sent_at IS NOT NULL);

-- audit log (immutable: no UPDATE/DELETE policies)
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  admin_name text,
  action_type text NOT NULL,
  target_type text,
  target_id text,
  description text,
  ip_address text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_admin_read ON public.audit_log FOR SELECT
  USING (public.is_admin(auth.uid()));
CREATE POLICY audit_admin_insert ON public.audit_log FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()) AND admin_id = auth.uid());

-- realtime publication add (ignore if already member)
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'featured_sellers','announcements','audit_log','reviews',
    'withdrawals','seller_applications','seller_verifications',
    'ai_search_sessions','river_ops_conversations','gigs',
    'project_posts','categories'
  ]) LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;
