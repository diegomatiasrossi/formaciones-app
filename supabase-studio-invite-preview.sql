-- ════════════════════════════════════════════════════════════════════════════
-- FIX — Preview de invitación para usuarios DESLOGUEADOS
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ════════════════════════════════════════════════════════════════════════════
-- Problema: las políticas RLS de organization_invites requieren auth.uid()
-- (invites_admin_all / invites_self_select). Un usuario que NO está logueado
-- (el caso típico de un profe recién invitado) no puede leer la invitación
-- → InvitePage mostraba "invitación inválida" en vez de pedirle que se loguee.
--
-- Solución: función SECURITY DEFINER que devuelve SOLO los datos de preview
-- de una invitación válida (no aceptada, no expirada) a partir del token.
-- El token es una credencial secreta (bearer) — quien lo tiene puede ver el
-- preview, igual que un link de "compartir". No expone datos sensibles más
-- allá del nombre de la organización, el rol y el email ya conocido por quien
-- recibió el link.
-- ════════════════════════════════════════════════════════════════════════════

create or replace function get_invite_preview(invite_token text)
returns table(organization_id uuid, organization_name text, email text, role text, expires_at timestamptz)
language sql
security definer
stable
set search_path = public
as $$
  select
    i.organization_id,
    o.name as organization_name,
    i.email,
    i.role,
    i.expires_at
  from organization_invites i
  join organizations o on o.id = i.organization_id
  where i.token = invite_token
    and i.accepted_at is null
    and i.expires_at > now()
$$;

-- Accesible para usuarios anónimos (deslogueados) y autenticados.
revoke execute on function get_invite_preview(text) from public;
grant  execute on function get_invite_preview(text) to anon, authenticated;

-- Verificar:
-- select * from get_invite_preview('<token>');
