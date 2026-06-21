-- ════════════════════════════════════════════════════════════════════════════
-- FIX — Crear organización requiere plan Studio (refuerzo backend)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
-- Problema: create_organization() no validaba el plan → cualquier usuario Free
-- podía crear una organización y acceder a toda la funcionalidad Studio sin pagar.
--
-- Este script reemplaza create_organization() AGREGANDO la validación de plan al
-- principio. El resto de la lógica queda EXACTAMENTE igual (incluida la forma de
-- poblar organization_members.email con un select server-side dentro de la
-- función SECURITY DEFINER — eso es la Opción B y no se cambia).
--
-- DEPENDENCIA: requiere get_user_plan(uuid) (creada en
-- supabase-maxdancers-trigger.sql). get_user_plan ya devuelve 'studio' para el
-- owner (bypass por email), así que el owner pasa el chequeo automáticamente.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
  user_plan  text;
begin
  -- NUEVO: crear organización es una feature Studio.
  -- get_user_plan devuelve 'studio' también para el owner (bypass por email).
  user_plan := get_user_plan(auth.uid());
  if user_plan <> 'studio' then
    raise exception 'Creating an organization requires the Studio plan';
  end if;

  if trim(org_name) = '' then
    raise exception 'El nombre de la organización no puede estar vacío';
  end if;

  insert into organizations (name)
    values (trim(org_name))
    returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role, email, joined_at)
    values (
      new_org_id,
      auth.uid(),
      'admin',
      (select email from auth.users where id = auth.uid()),
      now()
    );

  return new_org_id;
end;
$$;

revoke execute on function create_organization(text) from public;
grant  execute on function create_organization(text) to authenticated;

-- ─── Prueba manual ────────────────────────────────────────────────────────────
-- Con un usuario Free (no owner) → debe FALLAR:
--   select create_organization('Test Org');
--   → ERROR: Creating an organization requires the Studio plan
-- Con un usuario Studio o el owner → debe devolver el uuid de la org nueva.
