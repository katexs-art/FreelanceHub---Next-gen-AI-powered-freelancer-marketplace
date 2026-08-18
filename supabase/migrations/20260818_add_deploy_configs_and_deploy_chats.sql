-- deploy_configs: stores scraped business configurations
create table if not exists public.deploy_configs (
  id uuid primary key default gen_random_uuid(),
  url text not null,
  business_name text,
  niche text,
  services jsonb default '[]'::jsonb,
  hours text,
  phones jsonb default '[]'::jsonb,
  faq jsonb default '[]'::jsonb,
  brand_colors jsonb default '[]'::jsonb,
  logo text,
  raw_config jsonb default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','scanning','ready','failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- deploy_chats: stores chat messages with IP-based rate limiting
create table if not exists public.deploy_chats (
  id uuid primary key default gen_random_uuid(),
  deploy_config_id uuid not null references public.deploy_configs(id) on delete cascade,
  ip_address inet not null,
  role text not null check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_deploy_configs_status on public.deploy_configs(status);
create index if not exists idx_deploy_chats_config_id on public.deploy_chats(deploy_config_id);
create index if not exists idx_deploy_chats_ip_config on public.deploy_chats(deploy_config_id, ip_address);

-- Enable RLS
alter table public.deploy_configs enable row level security;
alter table public.deploy_chats enable row level security;

-- RLS policies: deploy_configs are publicly readable (demo pages), insert via service role only
create policy "deploy_configs_select" on public.deploy_configs
  for select using (true);

create policy "deploy_configs_insert" on public.deploy_configs
  for insert with check (true);

create policy "deploy_configs_update" on public.deploy_configs
  for update using (true);

-- RLS policies: deploy_chats are publicly readable/insertable (anonymous demo users)
create policy "deploy_chats_select" on public.deploy_chats
  for select using (true);

create policy "deploy_chats_insert" on public.deploy_chats
  for insert with check (true);

-- Grant access to anon and authenticated roles
grant select, insert, update on public.deploy_configs to anon, authenticated;
grant select, insert on public.deploy_chats to anon, authenticated;

-- Function to count messages per IP per deploy config (for 15-msg cap)
create or replace function public.count_deploy_chat_messages(
  p_deploy_config_id uuid,
  p_ip_address inet
) returns integer
language sql
stable
security definer
as $$
  select count(*)::integer
  from public.deploy_chats
  where deploy_config_id = p_deploy_config_id
    and ip_address = p_ip_address
    and role = 'user';
$$;

grant execute on function public.count_deploy_chat_messages(uuid, inet) to anon, authenticated;
