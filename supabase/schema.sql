create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  auth_provider text,
  external_auth_id text unique
);

create table if not exists public.browser_sessions (
  id uuid primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  client_instance_id text not null,
  browser_info text
);

create table if not exists public.transform_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid not null references public.browser_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  domain text not null,
  prompt text not null,
  preset_used text,
  status text not null check (status in ('success', 'failed')),
  hide_count integer not null default 0,
  remove_count integer not null default 0,
  restyle_count integer not null default 0,
  inject_count integer not null default 0,
  total_affected_count integer not null default 0,
  snapshot_node_count integer,
  estimated_tokens integer,
  estimated_api_cost numeric(10, 6),
  latency_ms integer,
  error_message text
);

create index if not exists idx_users_external_auth_id on public.users(external_auth_id);
create index if not exists idx_browser_sessions_user_id_started_at on public.browser_sessions(user_id, started_at desc);
create index if not exists idx_browser_sessions_client_instance_id on public.browser_sessions(client_instance_id);
create index if not exists idx_transform_events_user_id_created_at on public.transform_events(user_id, created_at desc);
create index if not exists idx_transform_events_session_id_created_at on public.transform_events(session_id, created_at desc);
create index if not exists idx_transform_events_domain_created_at on public.transform_events(domain, created_at desc);
create index if not exists idx_transform_events_status_created_at on public.transform_events(status, created_at desc);

alter table public.users enable row level security;
alter table public.browser_sessions enable row level security;
alter table public.transform_events enable row level security;

-- Temporary dev-mode compromise:
-- Auth0 is not wired yet, so the dashboard uses the anon key and a temporary local user id.
-- These relaxed read policies should be replaced with authenticated user-scoped policies later.
create policy "dev anon read users"
on public.users
for select
to anon
using (true);

create policy "dev anon read browser_sessions"
on public.browser_sessions
for select
to anon
using (true);

create policy "dev anon read transform_events"
on public.transform_events
for select
to anon
using (true);

-- Backend writes should use the service role key only.
-- TODO(auth0): replace the relaxed anon read policies above with policies tied to auth.uid()
-- and migrate temporary_local users.external_auth_id to real auth provider identifiers.
