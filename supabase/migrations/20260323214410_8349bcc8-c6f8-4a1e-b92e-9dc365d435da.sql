
-- Vapi Assistants
CREATE TABLE public.vapi_assistants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vapi_id text NOT NULL UNIQUE,
  name text,
  voice_provider text,
  voice_id text,
  model text,
  first_message text,
  system_prompt text,
  created_at_vapi timestamptz,
  raw_config jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT false
);
ALTER TABLE public.vapi_assistants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vapi assistants" ON public.vapi_assistants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vapi assistants" ON public.vapi_assistants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vapi assistants" ON public.vapi_assistants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vapi assistants" ON public.vapi_assistants FOR DELETE USING (auth.uid() = user_id);

-- Vapi Phone Numbers
CREATE TABLE public.vapi_phone_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vapi_id text NOT NULL UNIQUE,
  number text,
  provider text,
  area_code text,
  name text,
  assistant_id text,
  created_at_vapi timestamptz,
  raw_config jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now(),
  is_primary boolean DEFAULT false
);
ALTER TABLE public.vapi_phone_numbers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vapi numbers" ON public.vapi_phone_numbers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vapi numbers" ON public.vapi_phone_numbers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vapi numbers" ON public.vapi_phone_numbers FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own vapi numbers" ON public.vapi_phone_numbers FOR DELETE USING (auth.uid() = user_id);

-- Vapi Calls
CREATE TABLE public.vapi_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vapi_id text NOT NULL UNIQUE,
  assistant_id text,
  phone_number_id text,
  type text,
  status text,
  caller_number text,
  duration_seconds integer,
  ended_reason text,
  transcript text,
  recording_url text,
  summary text,
  cost numeric,
  started_at timestamptz,
  ended_at timestamptz,
  raw_data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.vapi_calls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vapi calls" ON public.vapi_calls FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vapi calls" ON public.vapi_calls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vapi calls" ON public.vapi_calls FOR UPDATE USING (auth.uid() = user_id);

-- Vapi Analytics
CREATE TABLE public.vapi_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  data jsonb DEFAULT '{}'::jsonb,
  synced_at timestamptz DEFAULT now()
);
ALTER TABLE public.vapi_analytics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own vapi analytics" ON public.vapi_analytics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vapi analytics" ON public.vapi_analytics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own vapi analytics" ON public.vapi_analytics FOR UPDATE USING (auth.uid() = user_id);
