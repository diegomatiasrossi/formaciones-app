import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/features/auth/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { isOwner } from '@/utils/isOwner'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { supabase } from '@/features/auth/supabaseClient'
import { Logo } from '@/components/ui/Logo'
import { Modal } from '@/components/ui/Modal'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { DangerZoneDeleteOrg } from '@/components/ui/DangerZoneDeleteOrg'
import { emailSchema, orgNameSchema, firstErrorKey } from '@/lib/validation'
import type { OrgMember, OrgInvite, OrgRole } from '@/types'

export function OrganizacionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { planName, loading: planLoading } = usePlan()
  // Crear org requiere Studio. Espeja el backend (get_user_plan devuelve
  // 'studio' para el owner), así que el owner pasa por el bypass de email.
  const canCreateOrg = planName === 'studio' || isOwner(user?.email)
  const { activeWorkspace, memberships, loadMemberships, switchToOrg } = useWorkspaceStore()

  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([])
  const [invites, setInvites]       = useState<OrgInvite[]>([])
  const [loading, setLoading]       = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState<OrgRole>('editor')
  const [showInvite, setShowInvite]   = useState(false)
  const [orgName, setOrgName]         = useState('')
  const [editingName, setEditingName] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<{ email: string; token: string } | null>(null)
  const [copied, setCopied]           = useState(false)

  const isOrgAdmin = activeWorkspace.type === 'org' && activeWorkspace.role === 'admin'
  const orgId      = activeWorkspace.type === 'org' ? activeWorkspace.orgId : null
  const displayName = activeWorkspace.type === 'org' ? activeWorkspace.orgName : ''

  useEffect(() => {
    if (orgId) { setOrgName(displayName); fetchOrgData() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  async function fetchOrgData() {
    if (!orgId) return
    setLoading(true)
    try {
      const [membRes, invRes] = await Promise.all([
        supabase
          .from('organization_members')
          .select('user_id, email, role, invited_at, joined_at')
          .eq('organization_id', orgId),
        supabase
          .from('organization_invites')
          .select('*')
          .eq('organization_id', orgId)
          .is('accepted_at', null)
          .gt('expires_at', new Date().toISOString()),
      ])

      const members: OrgMember[] = (membRes.data ?? []).map((r: Record<string, unknown>) => ({
        userId:    r.user_id as string,
        email:     (r.email as string | null) ?? undefined,
        role:      r.role as OrgRole,
        invitedAt: r.invited_at as string | undefined,
        joinedAt:  r.joined_at as string | undefined,
      }))
      setOrgMembers(members)

      const inv: OrgInvite[] = (invRes.data ?? []).map((r: Record<string, unknown>) => ({
        id:             r.id as string,
        organizationId: r.organization_id as string,
        email:          r.email as string,
        role:           r.role as OrgRole,
        invitedBy:      r.invited_by as string | undefined,
        token:          r.token as string,
        createdAt:      r.created_at as string | undefined,
        acceptedAt:     r.accepted_at as string | undefined,
        expiresAt:      r.expires_at as string | undefined,
      }))
      setInvites(inv)
    } finally {
      setLoading(false)
    }
  }

  async function handleInvite() {
    if (!orgId || !inviteEmail.trim() || !user) return
    const parsedEmail = emailSchema.safeParse(inviteEmail)
    if (!parsedEmail.success) { setInviteError(t(firstErrorKey(parsedEmail)!)); return }
    setSaving(true)
    setInviteError(null)
    const { data, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: orgId,
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        invited_by: user.id,
      })
      .select('token')
      .single()
    setSaving(false)
    if (error) {
      setInviteError(error.message)
      return
    }
    setInviteSuccess({ email: inviteEmail.trim().toLowerCase(), token: (data as { token: string }).token })
    fetchOrgData()
  }

  function closeInviteModal() {
    setShowInvite(false)
    setInviteEmail('')
    setInviteError(null)
    setInviteSuccess(null)
    setCopied(false)
  }

  async function copyInviteLink(link: string) {
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleRoleChange(userId: string, newRole: OrgRole) {
    if (!orgId) return
    await supabase.from('organization_members')
      .update({ role: newRole })
      .eq('organization_id', orgId)
      .eq('user_id', userId)
    fetchOrgData()
  }

  async function handleRemoveMember(userId: string) {
    if (!orgId) return
    await supabase.from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId)
    fetchOrgData()
  }

  async function handleSaveName() {
    if (!orgId || !orgName.trim()) return
    if (!orgNameSchema.safeParse(orgName).success) return
    setSaving(true)
    await supabase.from('organizations').update({ name: orgName.trim() }).eq('id', orgId)
    await loadMemberships()
    setSaving(false); setEditingName(false)
  }

  async function handleCreateOrg() {
    if (!orgName.trim()) return
    const parsedName = orgNameSchema.safeParse(orgName)
    if (!parsedName.success) { setCreateError(t(firstErrorKey(parsedName)!)); return }
    setSaving(true)
    setCreateError(null)
    const { data, error } = await supabase.rpc('create_organization', { org_name: orgName.trim() })
    setSaving(false)
    if (error) {
      // Mapear el rechazo de plan del backend a un mensaje amigable
      setCreateError(
        /requires the studio plan/i.test(error.message)
          ? t('org.requires_studio')
          : error.message,
      )
      return
    }
    if (!data) {
      setCreateError('La función no devolvió un ID. Revisá la consola.')
      return
    }
    const newOrgId = String(data)
    await loadMemberships()
    // Primary path: switchToOrg reads from the updated memberships store
    switchToOrg(newOrgId)
    // Defensive fallback: if switchToOrg didn't find the membership (e.g. loadMemberships
    // returned empty due to a transient RLS or query issue), set the workspace directly
    // using the data we already have from the RPC call.
    if (useWorkspaceStore.getState().activeWorkspace.type !== 'org') {
      console.warn('[org] switchToOrg did not update activeWorkspace — applying direct fallback')
      useWorkspaceStore.setState({
        activeWorkspace: { type: 'org', orgId: newOrgId, orgName: orgName.trim(), role: 'admin' },
        memberships: [
          ...useWorkspaceStore.getState().memberships,
          { organizationId: newOrgId, organizationName: orgName.trim(), role: 'admin' as const },
        ],
      })
    }
  }

  // If user has no org workspace active, show create form
  if (!orgId) {
    return (
      <div className="min-h-screen bg-crema text-negro">
        <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10">
          <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
          <button onClick={() => navigate('/projects')} className="text-xs text-gris hover:text-negro">← Proyectos</button>
        </header>
        <main className="max-w-lg mx-auto px-6 py-16 text-center">
          <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-dorado mx-auto">⬡</div>
          <h1 className="text-xl font-semibold mb-2">{t('org.create_org')}</h1>

          {planLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-rojo border-t-transparent rounded-full animate-spin" />
            </div>
          ) : canCreateOrg ? (
            <>
              <p className="text-sm text-gris mb-8">{t('org.no_org_yet')}</p>
              <div className="flex gap-3">
                <input value={orgName} onChange={e => { setOrgName(e.target.value); setCreateError(null) }}
                  onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                  placeholder={t('org.org_name_placeholder')}
                  className="flex-1 bg-blanco border border-borde-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rojo" />
                <button onClick={handleCreateOrg} disabled={!orgName.trim() || saving}
                  className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">
                  {saving ? '...' : t('org.create_org')}
                </button>
              </div>
              {createError && (
                <div className="mt-3 px-4 py-3 bg-rojo/8 border border-rojo/30 rounded-lg text-sm text-rojo text-left">
                  {createError}
                </div>
              )}
            </>
          ) : (
            // Crear org es una feature Studio — gate igual que Reportes/Actividades.
            // Nota: esto solo bloquea CREAR. Quien ya es miembro de una org la ve y
            // la usa normalmente al cambiar a ese espacio desde el WorkspaceSwitcher.
            <div className="bg-blanco border border-borde-light rounded-2xl p-8 shadow-soft">
              <UpgradeGate requiredPlan="studio" featureName={t('org.requires_studio')}
                headline={t('upgrade.org_headline')}
                description={t('upgrade.org_desc')}
                ctaText={t('upgrade.cta_studio')}
                lightBg />
            </div>
          )}

          {memberships.length > 0 && (
            <div className="mt-10 text-left">
              <p className="text-xs text-gris uppercase tracking-wider mb-3">Tus organizaciones</p>
              {memberships.map(m => (
                <div key={m.organizationId} className="flex items-center justify-between p-3 bg-blanco border border-borde-light rounded-xl mb-2">
                  <div>
                    <div className="text-sm font-medium">{m.organizationName}</div>
                    <div className="text-xs text-gris">{t(`org.role_${m.role}`)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    )
  }

  const seatCount = orgMembers.filter(m => m.joinedAt).length
  const includedSeats = 3 // from org settings — simplified for now

  return (
    <div className="min-h-screen bg-crema text-negro">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
        <button onClick={() => navigate('/projects')} className="text-xs text-gris hover:text-negro">← Proyectos</button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Org name */}
        <div className="bg-blanco border border-borde-light rounded-2xl p-6 shadow-soft">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-gris mb-3">{t('org.org_management')}</h2>
          {editingName ? (
            <div className="flex gap-3">
              <input value={orgName} onChange={e => setOrgName(e.target.value)}
                className="flex-1 bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
              <button onClick={handleSaveName} disabled={saving}
                className="px-4 py-2 bg-rojo text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">
                {saving ? '...' : 'Guardar'}
              </button>
              <button onClick={() => { setEditingName(false); setOrgName(displayName) }}
                className="px-4 py-2 text-gris text-sm hover:text-negro">Cancelar</button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-semibold">{displayName}</h1>
              {isOrgAdmin && (
                <button onClick={() => setEditingName(true)}
                  className="text-xs text-gris hover:text-negro">Renombrar</button>
              )}
            </div>
          )}
        </div>

        {/* Seats counter */}
        <div className="bg-blanco border border-borde-light rounded-2xl p-6 shadow-soft">
          <div className="flex items-center justify-between mb-1">
            <p className="text-sm font-medium">{t('org.seats_used', { used: seatCount, included: includedSeats })}</p>
            {isOrgAdmin && (
              <button onClick={() => setShowInvite(true)}
                className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-xs font-semibold rounded-lg">
                + {t('org.invite_member')}
              </button>
            )}
          </div>
          {seatCount > includedSeats && (
            <p className="text-xs text-dorado-oscuro mt-1">{t('org.extra_seat_cost')}</p>
          )}
        </div>

        {/* Members list */}
        <div className="bg-blanco border border-borde-light rounded-2xl p-6 shadow-soft">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-4">Integrantes del equipo</h3>
          {loading ? (
            <p className="text-sm text-gris">Cargando...</p>
          ) : (
            <div className="space-y-2">
              {orgMembers.map(m => (
                <div key={m.userId} className="flex items-center gap-3 py-2 border-b border-borde-light last:border-0">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{m.email ?? m.userId.slice(0, 8)}</div>
                    <div className="text-xs text-gris">{m.joinedAt ? 'Activo' : 'Pendiente'}</div>
                  </div>
                  {isOrgAdmin && m.userId !== user?.id ? (
                    <div className="flex items-center gap-2">
                      <select value={m.role} onChange={e => handleRoleChange(m.userId, e.target.value as OrgRole)}
                        className="text-xs bg-crema border border-borde-light rounded px-2 py-1 focus:outline-none">
                        <option value="admin">{t('org.role_admin')}</option>
                        <option value="editor">{t('org.role_editor')}</option>
                        <option value="viewer">{t('org.role_viewer')}</option>
                      </select>
                      <button onClick={() => handleRemoveMember(m.userId)}
                        className="text-xs text-gris/50 hover:text-rojo transition-colors">×</button>
                    </div>
                  ) : (
                    <span className="text-xs text-gris px-2 py-1 border border-borde-light rounded">
                      {t(`org.role_${m.role}`)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pending invites */}
        {invites.length > 0 && (
          <div className="bg-blanco border border-borde-light rounded-2xl p-6 shadow-soft">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-4">{t('org.pending_invites')}</h3>
            <div className="space-y-2">
              {invites.map(inv => (
                <div key={inv.id} className="flex items-center justify-between py-2 border-b border-borde-light last:border-0">
                  <div>
                    <div className="text-sm">{inv.email}</div>
                    <div className="text-xs text-gris">{t(`org.role_${inv.role}`)} · {t('org.invite_sent')}</div>
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full border border-dorado/40 text-dorado-oscuro bg-dorado/5">
                    Pendiente
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone — solo admins */}
        {isOrgAdmin && (
          <DangerZoneDeleteOrg orgId={orgId} orgName={displayName} memberCount={orgMembers.length} />
        )}

        {/* Crear otra organización — visible para Studio/owner aunque ya estén en una org activa */}
        {canCreateOrg && (
          <div className="border border-borde-light rounded-2xl p-6 shadow-soft bg-blanco">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-4">{t('org.create_org')}</h3>
            <div className="flex gap-3">
              <input value={orgName} onChange={e => { setOrgName(e.target.value); setCreateError(null) }}
                onKeyDown={e => e.key === 'Enter' && handleCreateOrg()}
                placeholder={t('org.org_name_placeholder')}
                className="flex-1 bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
              <button onClick={handleCreateOrg} disabled={!orgName.trim() || saving}
                className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">
                {saving ? '...' : t('org.create_org')}
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-xs text-rojo bg-rojo/8 border border-rojo/20 rounded-lg px-3 py-2">{createError}</p>
            )}
          </div>
        )}
      </main>

      {/* Invite modal */}
      <Modal open={showInvite} onClose={closeInviteModal} title={inviteSuccess ? '✓ Invitación creada' : t('org.invite_member')}>
        {inviteSuccess ? (
          <div className="space-y-4">
            <p className="text-sm text-negro/80">
              Invitación lista para <strong>{inviteSuccess.email}</strong>.
              Esta app no envía emails automáticos — compartí el link manualmente con el profe.
            </p>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">Link de invitación</label>
              <div className="flex gap-2">
                <input
                  readOnly
                  value={`${window.location.origin}/invite/${inviteSuccess.token}`}
                  className="flex-1 bg-crema border border-borde-light rounded-lg px-3 py-2 text-xs text-negro focus:outline-none select-all"
                  onClick={e => (e.target as HTMLInputElement).select()}
                />
                <button
                  onClick={() => copyInviteLink(`${window.location.origin}/invite/${inviteSuccess.token}`)}
                  className="px-3 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-xs font-semibold rounded-lg shrink-0 transition-colors"
                >
                  {copied ? '✓ Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
            <p className="text-[11px] text-gris/60">El link expira en 7 días. El profe debe tener una cuenta en Crewficina para aceptarlo.</p>
            <div className="flex justify-end pt-1">
              <button onClick={closeInviteModal} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">Email</label>
              <input value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteError(null) }}
                placeholder={t('org.invite_email_placeholder')}
                type="email"
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
            </div>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">Rol</label>
              <select value={inviteRole} onChange={e => setInviteRole(e.target.value as OrgRole)}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo">
                <option value="editor">{t('org.role_editor')}</option>
                <option value="viewer">{t('org.role_viewer')}</option>
                <option value="admin">{t('org.role_admin')}</option>
              </select>
            </div>
            {inviteError && (
              <p className="text-xs text-rojo bg-rojo/8 border border-rojo/20 rounded-lg px-3 py-2">{inviteError}</p>
            )}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={closeInviteModal} className="px-4 py-2 text-sm text-gris hover:text-negro">Cancelar</button>
              <button onClick={handleInvite} disabled={!inviteEmail.trim() || saving}
                className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">
                {saving ? '...' : t('org.invite_member')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
