-- ─── MIGRACIÓN: Dimensiones personalizadas de escenario ──────────────────────
-- Ejecutar en Supabase Dashboard > SQL Editor

alter table projects
  add column if not exists stage_width  numeric,
  add column if not exists stage_height numeric;

-- Verificar resultado:
-- SELECT id, name, stage_ratio, stage_width, stage_height
-- FROM projects LIMIT 5;
