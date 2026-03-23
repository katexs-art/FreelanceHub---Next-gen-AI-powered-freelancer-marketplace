
-- Notification settings
CREATE TABLE public.notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  setting_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, setting_key)
);
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own notification settings" ON public.notification_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notification settings" ON public.notification_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notification settings" ON public.notification_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Team members
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  user_id uuid,
  role text NOT NULL DEFAULT 'viewer',
  permissions jsonb DEFAULT '{}'::jsonb,
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_active timestamptz
);
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners can view team" ON public.team_members FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can manage team" ON public.team_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update team" ON public.team_members FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete team" ON public.team_members FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Team invites
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL,
  invitee_email text NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  accepted boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own invites" ON public.team_invites FOR SELECT TO authenticated USING (auth.uid() = inviter_id);
CREATE POLICY "Users can create invites" ON public.team_invites FOR INSERT TO authenticated WITH CHECK (auth.uid() = inviter_id);
CREATE POLICY "Users can update own invites" ON public.team_invites FOR UPDATE TO authenticated USING (auth.uid() = inviter_id);
CREATE POLICY "Users can delete own invites" ON public.team_invites FOR DELETE TO authenticated USING (auth.uid() = inviter_id);

-- Add new columns to users table
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS brand_color text DEFAULT '#4ade80',
  ADD COLUMN IF NOT EXISTS business_address jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS working_hours jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS river_config jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
