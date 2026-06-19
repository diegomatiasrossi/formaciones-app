import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { registerSession, detectIncognito } from '@/features/auth/sessionGuard'
import { supabase } from '@/features/auth/supabaseClient'

export function useSessionGuard(user: User | null) {
  const warnedIncognito = useRef(false)

  useEffect(() => {
    if (!user) return

    if (detectIncognito() && !warnedIncognito.current) {
      warnedIncognito.current = true
      console.warn('[CREWFICINA] Modo incógnito detectado.')
    }

    // Registrar sesión sin bloquear — validación multi-dispositivo desactivada
    // hasta estabilizar el flujo de auth. Re-activar en v3.
    registerSession(user.id).catch(() => {})

  }, [user])
}
