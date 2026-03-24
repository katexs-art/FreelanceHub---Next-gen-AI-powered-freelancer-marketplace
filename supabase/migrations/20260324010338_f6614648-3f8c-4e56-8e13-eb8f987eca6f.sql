
-- workflow_runs: tracks each workflow execution
CREATE TABLE public.workflow_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'running',
  trigger_data jsonb DEFAULT '{}'::jsonb,
  step_results jsonb DEFAULT '[]'::jsonb,
  steps_completed integer DEFAULT 0,
  current_step integer DEFAULT 0,
  wait_until timestamptz,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own workflow runs" ON public.workflow_runs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own workflow runs" ON public.workflow_runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workflow runs" ON public.workflow_runs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workflow runs" ON public.workflow_runs FOR DELETE USING (auth.uid() = user_id);

-- workflow_scheduled: queues delayed steps
CREATE TABLE public.workflow_scheduled (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid NOT NULL REFERENCES public.workflows(id) ON DELETE CASCADE,
  run_id uuid NOT NULL REFERENCES public.workflow_runs(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  resume_step integer NOT NULL DEFAULT 0,
  scheduled_for timestamptz NOT NULL,
  executed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.workflow_scheduled ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own scheduled items" ON public.workflow_scheduled FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own scheduled items" ON public.workflow_scheduled FOR INSERT WITH CHECK (auth.uid() = user_id);

-- error_logs: captures edge function errors (service role writes only)
CREATE TABLE public.error_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
