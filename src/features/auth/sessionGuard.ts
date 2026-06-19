import { supabase } from './supabaseClient'
import { nanoid } from '@/store/nanoid'

const SESSION_KEY = 'formaciones_session_token'

export async function registerSession(userId: string): Promise<void> {
  const token = nanoid() + nanoid()
  localStorage.setItem(SESSION_KEY, token)
  await supabase.from('user_sessions').upsert({
    user_id: userId,
    session_token: token,
    user_agent: navigator.userAgent.slice(0, 200),
    last_seen: new Date().toISOString(),
  }, { onConflict: 'user_id' })
}

export async function validateSession(userId: string): Promise<boolean> {
  const localToken = localStorage.getItem(SESSION_KEY)
  // Sin token local → primera carga o race condition al login: registrar y permitir
  if (!localToken) {
    await registerSession(userId)
    return true
  }
  const { data } = await supabase
    .from('user_sessions')
    .select('session_token')
    .eq('user_id', userId)
    .single()
  return data?.session_token === localToken
}

export async function refreshSession(userId: string): Promise<void> {
  const token = localStorage.getItem(SESSION_KEY)
  if (!token) return
  await supabase.from('user_sessions')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('session_token', token)
}

export function detectIncognito(): boolean {
  try {
    localStorage.setItem('__formaciones_test__', '1')
    localStorage.removeItem('__formaciones_test__')
    return false
  } catch {
    return true
  }
}
