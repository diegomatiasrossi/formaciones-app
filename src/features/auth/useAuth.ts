import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { registerSession } from './sessionGuard'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
      if (event === 'SIGNED_IN' && session?.user) {
        registerSession(session.user.id).catch(() => {})
      }
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const signInWithEmail = (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = (email: string, password: string) =>
    supabase.auth.signUp({ email, password })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signInWithEmail, signUpWithEmail, signInWithGoogle, signOut }
}
