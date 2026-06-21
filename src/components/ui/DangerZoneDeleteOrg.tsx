import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/features/auth/supabaseClient'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Modal } from '@/components/ui/Modal'

interface Props {
  orgId: string
  orgName: string
  memberCount: number
}

export function DangerZoneDeleteOrg({ orgId, orgName, memberCount }: Props) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { switchToPersonal, loadMemberships } = useWorkspaceStore()

  const [open, setOpen]       = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [counts, setCounts]   = useState({ members: 0, groups: 0, events: 0 })

  // Accurate counts straight from the DB (crewStore may be stale/empty if the
  // user navigated directly to /organizacion without visiting the crew pages).
  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      const [m, g, e] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('groups').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
        supabase.from('events').select('id', { count: 'exact', head: true }).eq('organization_id', orgId),
      ])
      if (!cancelled) {
        setCounts({ members: m.count ?? 0, groups: g.count ?? 0, events: e.count ?? 0 })
      }
    })()
    return () => { cancelled = true }
  }, [open, orgId])

  const matches = confirmText === orgName  // exact, case-sensitive

  function close() {
    setOpen(false); setConfirmText(''); setError(null); setDeleting(false)
  }

  async function handleDelete() {
    if (!matches) return
    setDeleting(true); setError(null)
    const { error: rpcError } = await supabase.rpc('delete_organization', { org_id: orgId })
    if (rpcError) {
      setError(rpcError.message || 'No se pudo eliminar la organización')
      setDeleting(false)
      return
    }
    // El espacio activo dejó de existir → volver al espacio personal y refrescar
    switchToPersonal()
    await loadMemberships()
    navigate('/projects')
  }

  return (
    <>
      <div className="border border-red-700/40 rounded-2xl p-6 bg-red-500/[0.03]">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-red-500 mb-2">
          {t('org.danger_zone')}
        </h3>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-gris flex-1 min-w-[200px]">
            {t('org.delete_org_warning', { count: memberCount })}
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-4 py-2 border border-red-700/60 text-red-500 hover:bg-red-500/10 text-sm font-semibold rounded-lg transition-colors shrink-0"
          >
            {t('org.delete_org')}
          </button>
        </div>
      </div>

      <Modal open={open} onClose={close} title={t('org.delete_org')}>
        <div className="space-y-4">
          <p className="text-sm text-negro/80">
            {t('org.delete_org_warning', { count: memberCount })}
          </p>

          <div className="bg-crema rounded-xl p-3 text-xs text-gris space-y-1">
            <div>◉ {counts.members} integrantes</div>
            <div>⬢ {counts.groups} grupos</div>
            <div>◈ {counts.events} eventos</div>
          </div>

          <div>
            <label className="block text-[11px] text-gris mb-1.5">
              {t('org.delete_org_confirm_label')}{' '}
              <strong className="text-negro">{orgName}</strong>
            </label>
            <input
              autoFocus
              value={confirmText}
              onChange={e => { setConfirmText(e.target.value); setError(null) }}
              placeholder={t('org.delete_org_confirm_placeholder')}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-500/8 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-1">
            <button onClick={close} className="px-4 py-2 text-sm text-gris hover:text-negro">
              {t('common.cancel')}
            </button>
            <button
              onClick={handleDelete}
              disabled={!matches || deleting}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-blanco text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {deleting ? '...' : t('org.delete_org_button')}
            </button>
          </div>
        </div>
      </Modal>
    </>
  )
}
