
CREATE TABLE public.ai_studio_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_type TEXT NOT NULL DEFAULT 'voice_test',
  config_snapshot JSONB DEFAULT '{}'::jsonb,
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_studio_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions" ON public.ai_studio_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can view own sessions" ON public.ai_studio_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL,
  visitor_id UUID NOT NULL DEFAULT gen_random_uuid(),
  messages JSONB DEFAULT '[]'::jsonb,
  lead_captured BOOLEAN NOT NULL DEFAULT false,
  contact_id UUID,
  source_url TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own chat sessions" ON public.chat_sessions FOR SELECT TO authenticated USING (auth.uid() = business_id);
CREATE POLICY "Anyone can insert chat sessions" ON public.chat_sessions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update chat sessions" ON public.chat_sessions FOR UPDATE TO anon, authenticated USING (true);
