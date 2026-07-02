-- Migración: tabla de dedup persistente para el cron de carritos abandonados.
-- Correr en Supabase Dashboard → SQL Editor.

create table if not exists abandoned_checkout_emails (
  session_id text primary key,
  sent_at    timestamptz default now()
);

-- RLS habilitado sin policies públicas: ningún cliente (anon/authenticated)
-- puede leer ni escribir. El cron usa el service role key, que bypasea RLS.
alter table abandoned_checkout_emails enable row level security;
