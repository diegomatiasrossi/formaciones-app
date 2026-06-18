-- ─── MIGRACIÓN: Stripe billing fields en user_plans ──────────────────────────
-- Ejecutar en Supabase Dashboard > SQL Editor

ALTER TABLE user_plans
  ADD COLUMN IF NOT EXISTS billing_cycle          text        DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS stripe_price_id        text,
  ADD COLUMN IF NOT EXISTS subscription_status    text        DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS current_period_start   timestamptz,
  ADD COLUMN IF NOT EXISTS current_period_end     timestamptz,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end   boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at             timestamptz DEFAULT now();

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_plans_updated_at ON user_plans;
CREATE TRIGGER user_plans_updated_at
  BEFORE UPDATE ON user_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Política: el servidor (service_role) puede escribir user_plans
-- La service_role key bypasses RLS automáticamente, no se necesita política adicional.

-- Verificar resultado:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'user_plans' ORDER BY ordinal_position;
