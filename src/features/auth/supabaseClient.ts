import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const SUPABASE_READY = Boolean(url && key)

if (!SUPABASE_READY) {
  console.warn(
    '[Formaciones] Supabase no configurado — modo local activo. ' +
    'Copiá .env.example a .env y completá los valores para habilitar auth y nube.',
  )
}

// Usamos URL/key placeholder para que createClient no lance error en modo local.
// Las llamadas reales fallarán silenciosamente y el store lo maneja.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  key || 'placeholder-key',
)

export { SUPABASE_READY }
