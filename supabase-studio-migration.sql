-- ════════════════════════════════════════════════════════════════════════════
-- MIGRACIÓN STUDIO — Fase 1: Organizaciones + Miembros + Invitaciones
-- Ejecutar en Supabase Dashboard > SQL Editor
-- ORDEN: correr ANTES de supabase-studio-rls-migration.sql
-- ════════════════════════════════════════════════════════════════════════════

-- ─── ORGANIZATIONS ───────────────────────────────────────────────────────────
create table if not exists organizations (
  id                      uuid primary key default gen_random_uuid(),
  name                    text not null,
  created_at              timestamptz default now(),
  stripe_customer_id      text,
  stripe_subscription_id  text,
  included_seats          int default 3,
  extra_seat_price_cents  int default 1000,  -- $10.00 USD por seat adicional
  subscription_status     text               -- 'active' | 'canceled' | etc.
);
alter table organizations enable row level security;

-- ─── ORGANIZATION_MEMBERS (n-a-n: usuarios × organizaciones) ─────────────────
create table if not exists organization_members (
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('admin', 'editor', 'viewer')),
  invited_at      timestamptz default now(),
  joined_at       timestamptz,  -- null hasta que acepta la invitación
  primary key (organization_id, user_id)
);
alter table organization_members enable row level security;

-- Cualquier usuario puede leer sus propias membresías (necesario para el workspace switcher)
drop policy if exists "org_members_self_select" on organization_members;
create policy "org_members_self_select"
  on organization_members for select
  using (user_id = auth.uid());

-- Admins pueden ver TODOS los miembros de sus organizaciones (para la página de gestión)
drop policy if exists "org_members_admin_select" on organization_members;
create policy "org_members_admin_select"
  on organization_members for select
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Admins pueden actualizar roles
drop policy if exists "org_members_admin_update" on organization_members;
create policy "org_members_admin_update"
  on organization_members for update
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Admins pueden eliminar miembros
drop policy if exists "org_members_admin_delete" on organization_members;
create policy "org_members_admin_delete"
  on organization_members for delete
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- INSERT solo vía funciones SECURITY DEFINER (create_organization / accept_org_invite)
-- No se necesita política de insert aquí porque las funciones usan SECURITY DEFINER

-- ─── RLS de ORGANIZATIONS (depende de organization_members) ──────────────────
drop policy if exists "orgs_member_select" on organizations;
create policy "orgs_member_select"
  on organizations for select
  using (
    id in (select organization_id from organization_members where user_id = auth.uid())
  );

drop policy if exists "orgs_admin_update" on organizations;
create policy "orgs_admin_update"
  on organizations for update
  using (
    id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- INSERT de orgs también vía función SECURITY DEFINER (ver abajo)

-- ─── ORGANIZATION_INVITES ─────────────────────────────────────────────────────
create table if not exists organization_invites (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  email           text not null,
  role            text not null check (role in ('admin', 'editor', 'viewer')),
  invited_by      uuid references auth.users(id),
  token           text unique not null default gen_random_uuid()::text,
  created_at      timestamptz default now(),
  accepted_at     timestamptz,
  expires_at      timestamptz default (now() + interval '7 days')
);
alter table organization_invites enable row level security;

-- Admins pueden gestionar invitaciones de sus organizaciones
drop policy if exists "invites_admin_all" on organization_invites;
create policy "invites_admin_all"
  on organization_invites for all
  using (
    organization_id in (
      select organization_id from organization_members
      where user_id = auth.uid() and role = 'admin'
    )
  );

-- Usuarios pueden ver invitaciones dirigidas a su email (para la página de aceptar)
drop policy if exists "invites_self_select" on organization_invites;
create policy "invites_self_select"
  on organization_invites for select
  using (
    email = (select email from auth.users where id = auth.uid())
  );

-- ─── FUNCIÓN: Crear organización (resuelve el chicken-and-egg de RLS) ─────────
-- SECURITY DEFINER: se ejecuta con permisos del CREADOR de la función (postgres)
-- bypassea RLS para poder insertar en organizations + organization_members
create or replace function create_organization(org_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if trim(org_name) = '' then
    raise exception 'El nombre de la organización no puede estar vacío';
  end if;

  insert into organizations (name)
    values (trim(org_name))
    returning id into new_org_id;

  insert into organization_members (organization_id, user_id, role, joined_at)
    values (new_org_id, auth.uid(), 'admin', now());

  return new_org_id;
end;
$$;

-- Solo usuarios autenticados pueden llamar esta función
revoke execute on function create_organization(text) from public;
grant  execute on function create_organization(text) to authenticated;

-- ─── FUNCIÓN: Aceptar invitación ──────────────────────────────────────────────
create or replace function accept_org_invite(invite_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  invite_row organization_invites%rowtype;
  org_name   text;
begin
  select * into invite_row
    from organization_invites
    where token = invite_token
      and accepted_at is null
      and expires_at > now();

  if not found then
    raise exception 'Invitación no encontrada, ya aceptada, o expirada';
  end if;

  -- Verificar que el email del invite coincide con el usuario logueado
  if invite_row.email <> (select email from auth.users where id = auth.uid()) then
    raise exception 'Esta invitación no corresponde a tu cuenta';
  end if;

  -- Agregar o actualizar membresía
  insert into organization_members (organization_id, user_id, role, joined_at)
    values (invite_row.organization_id, auth.uid(), invite_row.role, now())
    on conflict (organization_id, user_id)
    do update set role = excluded.role, joined_at = now();

  -- Marcar invitación como aceptada
  update organization_invites
    set accepted_at = now()
    where id = invite_row.id;

  select name into org_name from organizations where id = invite_row.organization_id;

  return jsonb_build_object(
    'organization_id', invite_row.organization_id,
    'organization_name', org_name,
    'role', invite_row.role
  );
end;
$$;

revoke execute on function accept_org_invite(text) from public;
grant  execute on function accept_org_invite(text) to authenticated;

-- ─── Índices ──────────────────────────────────────────────────────────────────
create index if not exists idx_org_members_user   on organization_members(user_id);
create index if not exists idx_org_members_org    on organization_members(organization_id);
create index if not exists idx_org_invites_token  on organization_invites(token);
create index if not exists idx_org_invites_email  on organization_invites(email);

-- ─── Verificar ────────────────────────────────────────────────────────────────
-- select table_name from information_schema.tables
-- where table_name in ('organizations','organization_members','organization_invites');
