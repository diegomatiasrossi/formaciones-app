-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN STUDIO — Fase 2: Extender tablas existentes + actualizar RLS
-- Ejecutar DESPUÉS de supabase-studio-migration.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Agregar organization_id a las tablas existentes ─────────────────────────
-- Columna nullable: NULL = espacio personal, NOT NULL = pertenece a la organización
alter table members    add column if not exists organization_id uuid references organizations(id);
alter table groups     add column if not exists organization_id uuid references organizations(id);
alter table events     add column if not exists organization_id uuid references organizations(id);
alter table activities add column if not exists organization_id uuid references organizations(id);

-- Agregar nickname a members (ya referenciado en el TS, faltaba en el schema)
alter table members add column if not exists nickname text;

-- ─── Índices para las nuevas columnas ────────────────────────────────────────
create index if not exists idx_members_org     on members(organization_id)    where organization_id is not null;
create index if not exists idx_groups_org      on groups(organization_id)     where organization_id is not null;
create index if not exists idx_events_org      on events(organization_id)     where organization_id is not null;
create index if not exists idx_activities_org  on activities(organization_id) where organization_id is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR RLS — MEMBERS
-- Reemplaza la política "for all" con 4 políticas específicas por operación.
-- Regla: espacio personal (org_id IS NULL) = solo el owner.
--        espacio org = todos los miembros ven, solo admin/editor modifican.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Owner can manage own members" on members;
drop policy if exists "members_select_policy" on members;
drop policy if exists "members_insert_policy" on members;
drop policy if exists "members_update_policy" on members;
drop policy if exists "members_delete_policy" on members;

create policy "members_select_policy" on members for select
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    ))
  );

create policy "members_insert_policy" on members for insert
  with check (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "members_update_policy" on members for update
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "members_delete_policy" on members for delete
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR RLS — GROUPS
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Owner can manage own groups" on groups;
drop policy if exists "groups_select_policy" on groups;
drop policy if exists "groups_insert_policy" on groups;
drop policy if exists "groups_update_policy" on groups;
drop policy if exists "groups_delete_policy" on groups;

create policy "groups_select_policy" on groups for select
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    ))
  );

create policy "groups_insert_policy" on groups for insert
  with check (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "groups_update_policy" on groups for update
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "groups_delete_policy" on groups for delete
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR RLS — GROUP_MEMBERS
-- La política original chequeaba owner del group. Ahora también permite
-- acceso si el group pertenece a una org en la que el usuario es miembro.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Owner can manage own group_members" on group_members;
drop policy if exists "gm_select_policy" on group_members;
drop policy if exists "gm_insert_policy" on group_members;
drop policy if exists "gm_delete_policy" on group_members;

create policy "gm_select_policy" on group_members for select
  using (
    group_id in (
      select id from groups where
        (organization_id is null and owner_id = auth.uid())
        or (organization_id in (
          select organization_id from organization_members where user_id = auth.uid()
        ))
    )
  );

create policy "gm_insert_policy" on group_members for insert
  with check (
    group_id in (
      select id from groups where
        (organization_id is null and owner_id = auth.uid())
        or (organization_id in (
          select organization_id from organization_members
          where user_id = auth.uid() and role in ('admin', 'editor')
        ))
    )
  );

create policy "gm_delete_policy" on group_members for delete
  using (
    group_id in (
      select id from groups where
        (organization_id is null and owner_id = auth.uid())
        or (organization_id in (
          select organization_id from organization_members
          where user_id = auth.uid() and role in ('admin', 'editor')
        ))
    )
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR RLS — EVENTS
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Owner can manage own events" on events;
drop policy if exists "events_select_policy" on events;
drop policy if exists "events_insert_policy" on events;
drop policy if exists "events_update_policy" on events;
drop policy if exists "events_delete_policy" on events;

create policy "events_select_policy" on events for select
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    ))
  );

create policy "events_insert_policy" on events for insert
  with check (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "events_update_policy" on events for update
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "events_delete_policy" on events for delete
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

-- ════════════════════════════════════════════════════════════════════════════
-- ACTUALIZAR RLS — ACTIVITIES
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Owner can manage own activities" on activities;
drop policy if exists "activities_select_policy" on activities;
drop policy if exists "activities_insert_policy" on activities;
drop policy if exists "activities_update_policy" on activities;
drop policy if exists "activities_delete_policy" on activities;

create policy "activities_select_policy" on activities for select
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members where user_id = auth.uid()
    ))
  );

create policy "activities_insert_policy" on activities for insert
  with check (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "activities_update_policy" on activities for update
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

create policy "activities_delete_policy" on activities for delete
  using (
    (organization_id is null and owner_id = auth.uid())
    or (organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role in ('admin', 'editor')
    ))
  );

-- ─── Verificar ────────────────────────────────────────────────────────────────
-- Confirmar columnas agregadas:
-- select column_name from information_schema.columns
-- where table_name = 'members' and column_name in ('organization_id','nickname');
--
-- Confirmar políticas:
-- select policyname, cmd from pg_policies where tablename = 'members';
