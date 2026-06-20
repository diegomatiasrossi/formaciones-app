import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/features/auth/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Logo } from '@/components/ui/Logo'
import type { OrgInvite } from '@/types'

type PageState = 'loading' | 'invalid' | 'needs_login' | 'confirm' | 'success' | 'error'

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { loadMemberships, switchToOrg } = useWorkspaceStore()

  const [state, setState] = useState<PageState>('loading')
  const [invite, setInvite]   = useState<OrgInvite | null>(null)
  const [orgName, setOrgName] = useState('')
  const [accepting, setAccepting] = useState(false)
  const [errorMsg, setErrorMsg]   = useState('')

  useEffect(() => {
    if (authLoading) return
    if (!token) { setState('invalid'); return }

    setState('loading');
    (async () => {
      const { data, error } = await supabase
        .from('organization_invites')
        .select('*, organizations(name)')
        .eq('token', token)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString())
        .single()

      if (error || !data) { setState('invalid'); return }

      const row = data as Record<string, unknown>
      const org = row.organizations as { name?: string } | null
      setOrgName(org?.name ?? '')
      setInvite({
        id:             row.id as string,
        organizationId: row.organization_id as string,
        email:          row.email as string,
        role:           row.role as OrgInvite['role'],
        invitedBy:      row.invited_by as string | undefined,
        token:          row.token as string,
        createdAt:      row.created_at as string | undefined,
        expiresAt:      row.expires_at as string | undefined,
      })

      setState(user ? 'confirm' : 'needs_login')
    })()
  }, [token, authLoading, user])

  async function handleAccept() {
    if (!token) return
    setAccepting(true)
    try {
      const { data, error } = await supabase.rpc('accept_org_invite', { invite_token: token })
      if (error) { setErrorMsg(error.message); setState('error'); return }

      const result = data as { organization_id: string; organization_name: string; role: string } | null
      await loadMemberships()
      if (result?.organization_id) switchToOrg(result.organization_id)
      setState('success')
    } catch (err) {
      setErrorMsg(String(err)); setState('error')
    } finally {
      setAccepting(false)
    }
  }

  const roleLabel = invite ? t(`org.role_${invite.role}`) : ''

  return (
    <div className="min-h-screen bg-crema text-negro flex flex-col">
      <header className="px-6 py-4 border-b border-borde-light bg-crema/95">
        <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
      </header>

      <main className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full bg-blanco border border-borde-light rounded-2xl p-8 shadow-soft text-center">

          {state === 'loading' && (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-rojo border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {state === 'invalid' && (
            <>
              <div className="text-4xl mb-4 opacity-40">✉</div>
              <h1 className="text-lg font-semibold mb-2">{t('org.invite_invalid')}</h1>
              <button onClick={() => navigate('/')} className="mt-6 px-5 py-2.5 bg-rojo text-blanco text-sm font-semibold rounded-lg">
                Volver al inicio
              </button>
            </>
          )}

          {state === 'needs_login' && (
            <>
              <div className="text-4xl mb-4">⬡</div>
              <h1 className="text-lg font-semibold mb-2">{t('org.join_org')}</h1>
              <p className="text-sm text-gris mb-6">
                {t('org.join_confirm', { org: orgName, role: roleLabel })}
              </p>
              <p className="text-xs text-gris/60 mb-6">
                Necesitás iniciar sesión para aceptar esta invitación. Después de loguearte, volvé a este link.
              </p>
              <button onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                className="w-full py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">
                Iniciar sesión
              </button>
            </>
          )}

          {state === 'confirm' && invite && (
            <>
              <div className="text-4xl mb-4">⬡</div>
              <h1 className="text-lg font-semibold mb-2">{t('org.join_org')}</h1>
              <p className="text-sm text-gris mb-6">
                {t('org.join_confirm', { org: orgName, role: roleLabel })}
              </p>
              <div className="bg-crema rounded-xl p-4 mb-6 text-left text-xs space-y-1">
                <div><span className="text-gris">Organización:</span> <span className="font-medium">{orgName}</span></div>
                <div><span className="text-gris">Rol:</span> <span className="font-medium">{roleLabel}</span></div>
                <div><span className="text-gris">Invitado como:</span> <span className="font-medium">{invite.email}</span></div>
              </div>
              <button onClick={handleAccept} disabled={accepting}
                className="w-full py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">
                {accepting ? 'Aceptando...' : 'Aceptar invitación'}
              </button>
              <button onClick={() => navigate('/')} className="mt-3 w-full py-2 text-sm text-gris hover:text-negro">
                Rechazar
              </button>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="text-4xl mb-4 text-rojo">✓</div>
              <h1 className="text-lg font-semibold mb-2">{t('org.join_success', { org: orgName })}</h1>
              <p className="text-sm text-gris mb-6">Ya sos parte de la organización. Podés cambiar de espacio de trabajo desde la barra de navegación.</p>
              <button onClick={() => navigate('/projects')} className="px-5 py-2.5 bg-rojo text-blanco text-sm font-semibold rounded-lg">
                Ir a mis proyectos
              </button>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="text-4xl mb-4 opacity-40">⚠</div>
              <h1 className="text-lg font-semibold mb-2">Ocurrió un error</h1>
              <p className="text-sm text-gris mb-6">{errorMsg}</p>
              <button onClick={() => navigate('/')} className="px-5 py-2.5 bg-rojo text-blanco text-sm font-semibold rounded-lg">
                Volver al inicio
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
