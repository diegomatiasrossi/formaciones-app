-- ════════════════════════════════════════════════════════════════════════════
-- REFUERZO DE SEGURIDAD BACKEND — Límite de integrantes por escena (maxDancers)
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
-- Contexto: el límite de integrantes en escena (10 Free / 50 Solo Pro / ∞ Studio)
-- se validaba SOLO en el frontend (Toolbar). Un usuario técnico podía saltarlo
-- guardando el proyecto vía API directa. Este trigger lo refuerza en el backend.
--
-- Los "dancers" viven dentro de projects.data -> 'scenes' -> [n] -> 'dancers'
-- (JSONB). El trigger cuenta el máximo de dancers entre todas las escenas y lo
-- compara contra el límite del plan del DUEÑO del proyecto (los projects son
-- siempre personales, por owner_id — no tienen organization_id).
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Plan efectivo de un usuario (réplica EXACTA de usePlan.ts) ────────────
-- El frontend (usePlan.ts) lee user_plans.plan (default 'free') SIN filtrar por
-- subscription_status, y aplica un bypass de owner por email (isOwner /
-- VITE_OWNER_EMAIL). Replicamos esa misma lógica acá.
-- NOTA: los projects son personales (owner_id), así que el plan que aplica es
-- el plan PERSONAL del dueño — no el de ninguna organización. Esto es consistente
-- con cómo usePlan resuelve el plan hoy (no considera organizaciones todavía).
create or replace function get_user_plan(uid uuid)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select case
    -- Owner bypass: espejo de isOwner(email) === VITE_OWNER_EMAIL en el frontend.
    -- Sin esto, el owner (sin fila en user_plans) caería en 'free' y quedaría
    -- limitado a 10 integrantes en su propio backend.
    when (select email from auth.users where id = uid) = 'diegomatiasrossi@gmail.com'
      then 'studio'
    else coalesce(
      (select plan from user_plans where user_id = uid limit 1),
      'free'
    )
  end
$$;
revoke execute on function get_user_plan(uuid) from public;
grant  execute on function get_user_plan(uuid) to authenticated;

-- ─── 2. Validar que ninguna escena exceda el límite del plan ──────────────────
create or replace function validate_max_dancers(scenes_data jsonb, uid uuid)
returns boolean
language plpgsql
stable
set search_path = public
as $$
declare
  user_plan   text;
  max_allowed int;
  max_found   int;
begin
  -- Sin escenas → nada que validar
  if scenes_data is null or jsonb_typeof(scenes_data) <> 'array' then
    return true;
  end if;

  user_plan := get_user_plan(uid);

  max_allowed := case user_plan
    when 'free'     then 10
    when 'solo_pro' then 50
    when 'studio'   then 2147483647  -- sin límite real (max int)
    else 10                          -- default defensivo: el más estricto
  end;

  -- Escena con más dancers (defensivo ante escenas sin clave 'dancers')
  select coalesce(max(jsonb_array_length(coalesce(scene -> 'dancers', '[]'::jsonb))), 0)
  into max_found
  from jsonb_array_elements(scenes_data) as scene;

  return max_found <= max_allowed;
end;
$$;

-- ─── 3. Trigger: bloquear solo cuando los dancers AUMENTAN sobre el límite ────
-- Maneja el downgrade de plan: si un ex-Pro bajó a Free y tiene proyectos con
-- 11+ dancers guardados de antes, puede seguir editándolos (renombrar, mover,
-- quitar dancers) — solo se bloquea si el cambio AGREGA dancers por encima del
-- límite actual. Comparar el máximo NEW vs OLD garantiza esto.
create or replace function check_max_dancers_trigger()
returns trigger
language plpgsql
as $$
declare
  old_max int;
  new_max int;
begin
  -- INSERT: no hay OLD, validar directo
  if TG_OP = 'INSERT' then
    if not validate_max_dancers(new.data -> 'scenes', new.owner_id) then
      raise exception 'Plan limit exceeded: too many members in a scene for your current plan';
    end if;
    return new;
  end if;

  -- UPDATE: solo bloquear si el máximo de dancers AUMENTÓ y excede el límite
  select coalesce(max(jsonb_array_length(coalesce(scene -> 'dancers', '[]'::jsonb))), 0)
  into old_max
  from jsonb_array_elements(coalesce(old.data -> 'scenes', '[]'::jsonb)) as scene;

  select coalesce(max(jsonb_array_length(coalesce(scene -> 'dancers', '[]'::jsonb))), 0)
  into new_max
  from jsonb_array_elements(coalesce(new.data -> 'scenes', '[]'::jsonb)) as scene;

  if new_max > old_max and not validate_max_dancers(new.data -> 'scenes', new.owner_id) then
    raise exception 'Plan limit exceeded: too many members in a scene for your current plan';
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_max_dancers on projects;
create trigger enforce_max_dancers
  before insert or update on projects
  for each row
  execute function check_max_dancers_trigger();

-- ════════════════════════════════════════════════════════════════════════════
-- PRUEBAS MANUALES (descomentar y reemplazar <project_id> / usuario de prueba)
-- ════════════════════════════════════════════════════════════════════════════
-- Free con 11 dancers → debe FALLAR:
-- update projects
-- set data = jsonb_set(data, '{scenes,0,dancers}',
--   (select jsonb_agg(jsonb_build_object('x', 100, 'y', 100)) from generate_series(1,11)))
-- where id = '<project_id>';
--
-- Free con 10 dancers → debe PERMITIR:
-- update projects
-- set data = jsonb_set(data, '{scenes,0,dancers}',
--   (select jsonb_agg(jsonb_build_object('x', 100, 'y', 100)) from generate_series(1,10)))
-- where id = '<project_id>';
--
-- Renombrar un proyecto que YA tenía 11 dancers (downgrade) → debe PERMITIR
-- (porque new_max no aumentó respecto a old_max).
