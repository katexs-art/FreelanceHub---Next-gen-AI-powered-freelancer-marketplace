
CREATE TABLE public.river_ops_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  message text NOT NULL,
  daily_briefing boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.river_ops_conversations TO authenticated;
GRANT ALL ON public.river_ops_conversations TO service_role;

ALTER TABLE public.river_ops_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins read river ops convos"
  ON public.river_ops_conversations FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "admins insert river ops convos"
  ON public.river_ops_conversations FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()) AND user_id = auth.uid());

CREATE INDEX idx_river_ops_convos_user_created ON public.river_ops_conversations(user_id, created_at DESC);
