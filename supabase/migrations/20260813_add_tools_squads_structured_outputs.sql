-- Migration: add missing modules (Tools, Squads, Structured Outputs)
-- Matches existing conventions: workspace_id FK to workspaces, owner-only RLS
-- (no workspace_members table exists yet, so RLS checks workspaces.owner_id directly)

-- ============================================================
-- TOOLS
-- ============================================================
create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  type text not null, -- 'apiRequest' | 'transferCall' | 'endCall' | 'sms' | 'dtmf'
                       -- | 'google.calendar.event.create' | 'google.calendar.availability.check'
                       -- | 'mcp' | 'function' | 'handoff'
  name text not null,
  vapi_tool_id text,
  config jsonb not null default '{}', -- mirrors Vapi's tool object shape exactly
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table tools enable row level security;

create policy "owner can select own tools"
  on tools for select
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can insert own tools"
  on tools for insert
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can update own tools"
  on tools for update
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can delete own tools"
  on tools for delete
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create index if not exists idx_tools_workspace_id on tools(workspace_id);


-- ============================================================
-- SQUADS (multi-agent handoff)
-- ============================================================
create table if not exists squads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  vapi_squad_id text,
  members jsonb not null default '[]', -- array of { assistantId, assistantDestinations[] }
  member_overrides jsonb default '{}', -- shared overrides applied to all members (e.g. same voice)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table squads enable row level security;

create policy "owner can select own squads"
  on squads for select
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can insert own squads"
  on squads for insert
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can update own squads"
  on squads for update
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can delete own squads"
  on squads for delete
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create index if not exists idx_squads_workspace_id on squads(workspace_id);


-- ============================================================
-- STRUCTURED OUTPUTS
-- ============================================================
create table if not exists structured_outputs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references workspaces(id) on delete cascade not null,
  name text not null,
  vapi_structured_output_id text,
  schema jsonb not null, -- full JSON Schema definition
  type text not null default 'ai', -- 'ai' | 'regex'
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table structured_outputs enable row level security;

create policy "owner can select own structured_outputs"
  on structured_outputs for select
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can insert own structured_outputs"
  on structured_outputs for insert
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can update own structured_outputs"
  on structured_outputs for update
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can delete own structured_outputs"
  on structured_outputs for delete
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create index if not exists idx_structured_outputs_workspace_id on structured_outputs(workspace_id);


-- Per-call extracted data (results of running a structured output against a call)
-- References call_logs, matching your existing table name (not "calls")
create table if not exists call_extracted_data (
  id uuid primary key default gen_random_uuid(),
  call_id uuid references call_logs(id) on delete cascade not null,
  structured_output_id uuid references structured_outputs(id) on delete cascade not null,
  workspace_id uuid references workspaces(id) on delete cascade not null,
  data jsonb not null,
  created_at timestamptz not null default now()
);

alter table call_extracted_data enable row level security;

create policy "owner can select own call_extracted_data"
  on call_extracted_data for select
  using (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create policy "owner can insert own call_extracted_data"
  on call_extracted_data for insert
  with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));

create index if not exists idx_call_extracted_data_call_id on call_extracted_data(call_id);
create index if not exists idx_call_extracted_data_workspace_id on call_extracted_data(workspace_id);


-- ============================================================
-- OPTIONAL BUT RECOMMENDED: per-recipient campaign tracking
-- Flagged as a gap earlier — uncomment/run if `call_logs` does not already
-- have a campaign_id column giving you per-recipient status.
-- ============================================================
-- create table if not exists campaign_recipients (
--   id uuid primary key default gen_random_uuid(),
--   campaign_id uuid references campaigns(id) on delete cascade not null,
--   workspace_id uuid references workspaces(id) on delete cascade not null,
--   call_log_id uuid references call_logs(id),
--   customer_data jsonb not null, -- { number, name, ...dynamic CSV variables }
--   status text not null default 'queued', -- 'queued' | 'dialing' | 'completed' | 'failed'
--   created_at timestamptz not null default now()
-- );
-- alter table campaign_recipients enable row level security;
-- create policy "owner can select own campaign_recipients"
--   on campaign_recipients for select
--   using (workspace_id in (select id from workspaces where owner_id = auth.uid()));
-- create policy "owner can insert own campaign_recipients"
--   on campaign_recipients for insert
--   with check (workspace_id in (select id from workspaces where owner_id = auth.uid()));
-- create index if not exists idx_campaign_recipients_campaign_id on campaign_recipients(campaign_id);
