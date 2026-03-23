
-- Integration settings table
CREATE TABLE public.integration_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  integration_name text NOT NULL,
  api_key text,
  config jsonb DEFAULT '{}'::jsonb,
  connected_at timestamp with time zone DEFAULT now(),
  last_tested timestamp with time zone,
  status text NOT NULL DEFAULT 'disconnected',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.integration_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations" ON public.integration_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own integrations" ON public.integration_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own integrations" ON public.integration_settings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own integrations" ON public.integration_settings FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all integrations" ON public.integration_settings FOR SELECT USING (is_admin(auth.uid()));

-- Webhook logs table
CREATE TABLE public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  direction text NOT NULL DEFAULT 'inbound',
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  response jsonb DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'success',
  response_code integer,
  duration_ms integer,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook logs" ON public.webhook_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own webhook logs" ON public.webhook_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- API keys table
CREATE TABLE public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  key_hash text NOT NULL,
  name text NOT NULL DEFAULT 'Default',
  last_used timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own api keys" ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own api keys" ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own api keys" ON public.api_keys FOR DELETE USING (auth.uid() = user_id);
