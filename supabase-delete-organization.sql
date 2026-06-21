-- ════════════════════════════════════════════════════════════════════════════
-- FEATURE — Eliminar organización (cascade + función segura)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
-- Al borrar una organización:
--   • members / groups / events / activities de esa org → se BORRAN en cascada
--     (fueron compartidos para esa academia, no tienen sentido sin ella)
--   • projects.event_id / projects.group_id → se ponen en NULL (los proyectos
--     son del usuario, su trabajo creativo; pierden la referencia pero no se borran)
--
-- Los bloques DO buscan el nombre REAL de cada foreign key dinámicamente en
-- pg_constraint (no se asume el nombre) y lo reemplazan con la acción correcta.
-- Es idempotente: re-correrlo encuentra la FK actual (original o ya reemplazada)
-- y la deja con la acción deseada.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. members / groups / events / activities : organization_id ON DELETE CASCADE
do $$
declare
  tbl  text;
  cname text;
begin
  foreach tbl in array array['members','groups','events','activities'] loop
    -- Borrar TODA FK existente sobre <tbl>.organization_id → organizations
    for cname in
      select con.conname
      from pg_constraint con
      join pg_attribute att
        on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      where con.conrelid = tbl::regclass
        and con.contype = 'f'
        and con.confrelid = 'organizations'::regclass
        and att.attname = 'organization_id'
    loop
      execute format('alter table %I drop constraint %I', tbl, cname);
    end loop;

    -- Recrear con ON DELETE CASCADE
    execute format(
      'alter table %I add constraint %I foreign key (organization_id) '
      || 'references organizations(id) on delete cascade',
      tbl, tbl || '_organization_id_fkey'
    );
  end loop;
end $$;

-- ─── 2. projects.event_id → events  y  projects.group_id → groups : ON DELETE SET NULL
do $$
declare
  rec   record;
  cname text;
begin
  for rec in
    select * from (values
      ('event_id', 'events'),
      ('group_id', 'groups')
    ) as t(col, parent)
  loop
    -- Borrar TODA FK existente sobre projects.<col> → <parent>
    for cname in
      select con.conname
      from pg_constraint con
      join pg_attribute att
        on att.attrelid = con.conrelid and att.attnum = any(con.conkey)
      where con.conrelid = 'projects'::regclass
        and con.contype = 'f'
        and con.confrelid = rec.parent::regclass
        and att.attname = rec.col
    loop
      execute format('alter table projects drop constraint %I', cname);
    end loop;

    -- Recrear con ON DELETE SET NULL
    execute format(
      'alter table projects add constraint %I foreign key (%I) '
      || 'references %I(id) on delete set null',
      'projects_' || rec.col || '_fkey', rec.col, rec.parent
    );
  end loop;
end $$;

-- ─── 3. Función: eliminar organización (solo admins) ──────────────────────────
-- Usa is_org_admin (creada en el hotfix de RLS) para verificar permisos.
create or replace function delete_organization(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_org_admin(org_id) then
    raise exception 'Only administrators can delete an organization';
  end if;

  delete from organizations where id = org_id;
  -- El ON DELETE CASCADE de organization_members, organization_invites y de
  -- members/groups/events/activities limpia todo lo dependiente.
  -- projects.event_id / group_id quedan en NULL (los proyectos sobreviven).
end;
$$;

revoke execute on function delete_organization(uuid) from public;
grant  execute on function delete_organization(uuid) to authenticated;

-- ─── Verificar las acciones ON DELETE resultantes ─────────────────────────────
-- select conrelid::regclass as tabla, conname, confdeltype
-- from pg_constraint
-- where contype = 'f'
--   and conrelid::regclass::text in ('members','groups','events','activities','projects')
--   and confrelid::regclass::text in ('organizations','events','groups')
-- order by tabla;
-- confdeltype: 'c' = cascade, 'n' = set null, 'a' = no action
