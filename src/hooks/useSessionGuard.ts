import { useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import { validateSession, refreshSession, detectIncognito } from '@/features/auth/sessionGuard'
import { supabase } from '@/features/auth/supabaseClient'

export function useSessionGuard(user: User | null) {
  const warnedIncognito = useRef(false)

  useEffect(() => {
    if (!user) return

    if (detectIncognito() && !warnedIncognito.current) {
      warnedIncognito.current = true
      // Solo advertencia, no bloqueamos
      console.warn('[FORMACIONES] Modo incógnito detectado. El guardado local puede no funcionar.')
    }

    let intervalId: ReturnType<typeof setInterval>

    validateSession(user.id).then(valid => {
      if (!valid) {
        supabase.auth.signOut()
        // Mostrar mensaje al usuario
        const msg = document.createElement('div')
        msg.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999;padding:12px 16px;background:#1a0000;color:#ff6b6b;font-size:13px;text-align:center;border-bottom:1px solid #ff0000;'
        msg.textContent = 'Tu sesión fue iniciada en otro dispositivo. Por favor, volvé a ingresar.'
        document.body.prepend(msg)
        return
      }

      intervalId = setInterval(() => {
        refreshSession(user.id).catch(() => {})
      }, 5 * 60 * 1000)
    }).catch(() => {})

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [user])
}
