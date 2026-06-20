-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN: Módulos Integrantes / Grupos / Eventos / Actividades
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════

-- ─── MEMBERS (Integrantes) ───────────────────────────────────────────────────
create table if not exists members (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) not null,
  first_name  text not null,
  last_name   text,
  phone       text,
  email       text,
  type        text not null check (type in ('stage', 'team')),
  level       text check (level in ('beginner', 'intermediate', 'advanced', 'professional')),
  role        text,
  notes       text,
  created_at  timestamptz default now()
);
alter table members enable row level security;
drop policy if exists "Owner can manage own members" on members;
create policy "Owner can manage own members"
  on members for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── GROUPS (Crews permanentes) ──────────────────────────────────────────────
create table if not exists groups (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) not null,
  name        text not null,
  created_at  timestamptz default now()
);
alter table groups enable row level security;
drop policy if exists "Owner can manage own groups" on groups;
create policy "Owner can manage own groups"
  on groups for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── GROUP_MEMBERS (relación n-a-n) ──────────────────────────────────────────
create table if not exists group_members (
  group_id    uuid references groups(id) on delete cascade,
  member_id   uuid references members(id) on delete cascade,
  primary key (group_id, member_id)
);
alter table group_members enable row level security;
drop policy if exists "Owner can manage own group_members" on group_members;
create policy "Owner can manage own group_members"
  on group_members for all
  using (group_id in (select id from groups where owner_id = auth.uid()))
  with check (group_id in (select id from groups where owner_id = auth.uid()));

-- ─── EVENTS (Competencias/shows) ─────────────────────────────────────────────
create table if not exists events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid references auth.users(id) not null,
  name        text not null,
  event_date  date,
  location    text,
  group_id    uuid references groups(id),
  created_at  timestamptz default now()
);
alter table events enable row level security;
drop policy if exists "Owner can manage own events" on events;
create policy "Owner can manage own events"
  on events for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── PROJECTS: vínculo a grupo y evento ──────────────────────────────────────
alter table projects add column if not exists group_id uuid references groups(id);
alter table projects add column if not exists event_id uuid references events(id);

-- ─── ACTIVITIES (Actividades/checklist) ──────────────────────────────────────
create table if not exists activities (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid references auth.users(id) not null,
  title         text not null,
  done          boolean default false,
  context_type  text not null check (context_type in ('event', 'group')),
  context_id    uuid not null,
  is_preset     boolean default false,
  created_at    timestamptz default now()
);
alter table activities enable row level security;
drop policy if exists "Owner can manage own activities" on activities;
create policy "Owner can manage own activities"
  on activities for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ─── Índices para queries frecuentes ─────────────────────────────────────────
create index if not exists idx_members_owner     on members(owner_id);
create index if not exists idx_groups_owner      on groups(owner_id);
create index if not exists idx_events_owner      on events(owner_id);
create index if not exists idx_activities_context on activities(context_type, context_id);

-- Verificar:
-- select table_name from information_schema.tables
-- where table_name in ('members','groups','group_members','events','activities');
