-- ════════════════════════════════════════════════════════════════════════════
-- HOTFIX URGENTE — RLS recursion 500 en members/groups/events/activities
-- Ejecutar en Supabase Dashboard > SQL Editor
-- Causa: org_members_admin_select tenía subquery en organization_members,
-- que a su vez evaluaba org_members_admin_select → recursión infinita → 500.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── Paso 1: Eliminar las 3 políticas recursivas de organization_members ─────
drop policy if exists "org_members_admin_select" on organization_members;
drop policy if exists "org_members_admin_update" on organization_members;
drop policy if exists "org_members_admin_delete" on organization_members;

-- ─── Paso 2: Función SECURITY DEFINER para verificar rol admin ───────────────
-- SECURITY DEFINER bypasea RLS → no hay recursión cuando la función lee
-- organization_members desde dentro de una política de otra tabla.
create or replace function is_org_admin(org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = org_id
      and user_id = auth.uid()
      and role = 'admin'
  )
$$;

revoke execute on function is_org_admin(uuid) from public;
grant  execute on function is_org_admin(uuid) to authenticated;

-- ─── Paso 3: Recrear políticas de organization_members sin recursión ──────────

-- SELECT: el propio usuario ve su fila; admins ven todas las de su org
create policy "org_members_admin_select"
  on organization_members for select
  using (user_id = auth.uid() or is_org_admin(organization_id));

-- UPDATE: solo admins pueden cambiar roles
create policy "org_members_admin_update"
  on organization_members for update
  using (is_org_admin(organization_id));

-- DELETE: solo admins pueden eliminar miembros
create policy "org_members_admin_delete"
  on organization_members for delete
  using (is_org_admin(organization_id));

-- ─── Verificar que no quedan políticas duplicadas ──────────────────────────────
-- select policyname, cmd from pg_policies
-- where tablename = 'organization_members'
-- order by cmd, policyname;

-- ─── Verificar que las tablas vuelven a responder (como superusuario) ──────────
-- select count(*) from members;
-- select count(*) from groups;
-- select count(*) from events;
-- select count(*) from activities;
-- select count(*) from group_members;
