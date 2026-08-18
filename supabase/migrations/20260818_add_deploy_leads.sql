create table if not exists public.deploy_leads (
  id uuid primary key default gen_random_uuid(),
  deploy_config_id uuid references public.deploy_configs(id) on delete set null,
  name text not null,
  email text not null,
  phone text,
  business_type text,
  plan text check (plan in ('starter','professional','enterprise')),
  created_at timestamptz not null default now()
);

create index if not exists idx_deploy_leads_email on public.deploy_leads(email);
create index if not exists idx_deploy_leads_config on public.deploy_leads(deploy_config_id);

alter table public.deploy_leads enable row level security;

create policy "deploy_leads_insert" on public.deploy_leads
  for insert with check (true);

create policy "deploy_leads_select" on public.deploy_leads
  for select using (true);

grant select, insert on public.deploy_leads to anon, authenticated;
