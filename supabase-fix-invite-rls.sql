-- ════════════════════════════════════════════════════════════════════════════
-- FIX BUG-02 — "permission denied for table users" al invitar a una organización
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
-- Causa: la política RLS invites_self_select consultaba auth.users:
--     using (email = (select email from auth.users where id = auth.uid()))
-- El rol `authenticated` NO tiene SELECT sobre auth.users, así que cualquier
-- SELECT sobre organization_invites (p. ej. el .select('token') que corre
-- después del .insert() al crear una invitación) fallaba con
-- "permission denied for table users".
--
-- Fix: usar el claim de email del JWT (auth.jwt() ->> 'email') en vez de
-- consultar auth.users. Es el patrón estándar de Supabase para "el email del
-- usuario actual" sin tocar la tabla protegida.
--
-- La columna email ya existe en organization_invites (es NOT NULL); el ALTER
-- de abajo es idempotente y solo está por seguridad.
-- ════════════════════════════════════════════════════════════════════════════

alter table organization_invites add column if not exists email text;

drop policy if exists "invites_self_select" on organization_invites;
create policy "invites_self_select"
  on organization_invites for select
  using (email = (auth.jwt() ->> 'email'));

-- Verificar:
-- select policyname, qual from pg_policies
-- where tablename = 'organization_invites' and policyname = 'invites_self_select';
