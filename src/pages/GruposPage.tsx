import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrewStore } from '@/store/crewStore'
import { useAuth } from '@/features/auth/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Modal } from '@/components/ui/Modal'
import { Logo } from '@/components/ui/Logo'
import { ModuleNav } from '@/components/ui/ModuleNav'
import { ActivitiesPanel } from '@/components/ui/ActivitiesPanel'
import { PresetChecklistSelector } from '@/components/ui/PresetChecklistSelector'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { DEFAULT_CHECKLIST, TRAVEL_CHECKLIST } from '@/data/checklist'
import type { CrewGroup } from '@/types'

const FREE_LIMIT = 3

export function GruposPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const {
    groups, events, loading, fetchAll,
    createGroup, updateGroup, deleteGroup,
    membersOfGroup, createActivity, deleteActivity, activities,
  } = useCrewStore()
  const { can, features } = usePlan()
  const activeOrgId = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.orgId : null)
  const wsRole = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.role : null)
  const canEdit = wsRole === null || wsRole === 'admin' || wsRole === 'editor'
  // Límite Free (3) solo en espacio personal — las orgs son Studio. Owner/Pro/Studio
  // tienen maxProjects Infinity, así que isFree los excluye automáticamente.
  const isFree = features.maxProjects !== Infinity && activeOrgId === null
  const atLimit = isFree && groups.length >= FREE_LIMIT

  const [showNew, setShowNew] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [newName, setNewName] = useState('')
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [active, setActive] = useState<CrewGroup | null>(null)
  const [rename, setRename] = useState<CrewGroup | null>(null)
  const [renameVal, setRenameVal] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<CrewGroup | null>(null)

  useEffect(() => { if (user) fetchAll() }, [user, fetchAll, activeOrgId])

  async function create() {
    if (!newName.trim() || !canEdit || atLimit) return
    const newGroup = await createGroup(newName.trim())
    if (newGroup && selectedPresets.length > 0) {
      await Promise.all(
        selectedPresets.map(title => createActivity(title, 'group', newGroup.id, true))
      )
    }
    setNewName(''); setSelectedPresets([]); setShowNew(false)
  }

  // ── Vista detalle de un grupo ──────────────────────────────────────────────
  if (active) {
    const gMembers = membersOfGroup(active.id)
    const gEvents = events.filter(e => e.groupId === active.id)
    return (
      <div className="min-h-screen bg-crema text-negro">
        <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10 backdrop-blur-sm">
          <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
          <button onClick={() => setActive(null)} className="text-xs text-gris hover:text-negro">← {t('groups.title')}</button>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold mb-6">{active.name}</h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Integrantes */}
            <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gris">{t('groups.members')}</h3>
                <button onClick={() => navigate('/integrantes')} className="text-[10px] text-rojo hover:text-rojo-oscuro">{t('groups.manage')}</button>
              </div>
              {gMembers.length === 0 ? (
                <p className="text-xs text-gris/60 py-4 text-center">{t('groups.no_members')}</p>
              ) : (
                <div className="space-y-1.5">
                  {gMembers.map(m => (
                    <div key={m.id} className="flex items-center gap-2 text-sm py-1">
                      <span className="text-dorado">◉</span>{m.firstName} {m.lastName}
                      <span className="text-[9px] text-gris ml-auto">{t(`members.type_${m.type}`)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Eventos del grupo */}
            <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-3">{t('groups.events')}</h3>
              {gEvents.length === 0 ? (
                <p className="text-xs text-gris/60 py-4 text-center">{t('groups.no_events')}</p>
              ) : (
                <div className="space-y-1.5">
                  {gEvents.map(e => (
                    <button key={e.id} onClick={() => navigate('/eventos')} className="flex items-center gap-2 text-sm py-1 w-full text-left hover:text-rojo">
                      <span className="text-rojo">◈</span>{e.name}
                      {e.eventDate && <span className="text-[9px] text-gris ml-auto">{e.eventDate}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actividades del grupo */}
          <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft mt-6">
            <ActivitiesPanel contextType="group" contextId={active.id} />
          </div>

          {/* Tareas predefinidas (solo Pro+) */}
          {can('checklistEnabled') && (() => {
            const groupActivities = activities.filter(a => a.contextType === 'group' && a.contextId === active.id && a.isPreset)
            const togglePreset = async (label: string) => {
              const existing = groupActivities.find(a => a.title === label)
              if (existing) {
                await deleteActivity(existing.id)
              } else {
                await createActivity(label, 'group', active.id, true)
              }
            }
            const section = (items: typeof DEFAULT_CHECKLIST, title?: string) => (
              <div className="space-y-1.5">
                {title && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-dorado-oscuro mt-3 mb-1.5 pt-2 border-t border-borde-light/60">
                    {title}
                  </p>
                )}
                {items.map(item => {
                  const isAdded = groupActivities.some(a => a.title === item.label)
                  return (
                    <div
                      key={item.id}
                      onClick={() => togglePreset(item.label)}
                      className="flex items-center gap-2.5 cursor-pointer group"
                    >
                      <div className={[
                        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
                        isAdded ? 'bg-rojo border-rojo text-blanco' : 'border-borde-light group-hover:border-rojo',
                      ].join(' ')}>
                        {isAdded && <span className="text-[9px]">✓</span>}
                      </div>
                      <span className="text-sm text-negro/80 group-hover:text-negro transition-colors">{item.label}</span>
                    </div>
                  )
                })}
              </div>
            )
            return (
              <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft mt-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-1">{t('groups.preset_activities')}</h3>
                <p className="text-[10px] text-gris/60 mb-3">{t('groups.preset_activities_hint')}</p>
                <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
                  {section(DEFAULT_CHECKLIST)}
                  {section(TRAVEL_CHECKLIST, t('activities.suggested_tasks_travel'))}
                </div>
              </div>
            )
          })()}
        </main>
      </div>
    )
  }

  // ── Lista de grupos ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-crema text-negro">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
        <button onClick={() => navigate('/projects')} className="text-xs text-gris hover:text-negro">← {t('nav.projects')}</button>
      </header>
      <ModuleNav active="groups" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t('groups.title')}</h1>
            {isFree && <p className="text-xs text-gris mt-0.5">{t('upgrade.free_count', { count: groups.length, limit: FREE_LIMIT })}</p>}
          </div>
          {canEdit && <button onClick={() => atLimit ? setShowUpgrade(true) : setShowNew(true)} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg shadow-soft hover:-translate-y-0.5 transition-all">+ {t('groups.new')}</button>}
        </div>

        {loading && <p className="text-gris text-sm">{t('common.loading')}</p>}

        {!loading && groups.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-dorado">⬢</div>
            <h2 className="text-base font-semibold mb-2">{t('groups.empty')}</h2>
            {canEdit && <button onClick={() => atLimit ? setShowUpgrade(true) : setShowNew(true)} className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg mt-4">{t('groups.create_first')}</button>}
          </div>
        )}

        {!loading && groups.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map(g => {
              const count = membersOfGroup(g.id).length
              return (
                <div key={g.id} className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft hover:shadow-card hover:border-dorado/40 transition-all">
                  <button onClick={() => setActive(g)} className="text-left w-full">
                    <div className="text-2xl text-dorado mb-2">⬢</div>
                    <div className="font-semibold">{g.name}</div>
                    <div className="text-xs text-gris mt-1">{count} {t('members.count')}</div>
                  </button>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-borde-light">
                    <button onClick={() => setActive(g)} className="flex-1 text-[11px] py-1.5 border border-borde-light rounded-lg hover:border-dorado text-gris hover:text-dorado-oscuro">{t('groups.open')}</button>
                    {canEdit && <button onClick={() => { setRename(g); setRenameVal(g.name) }} className="flex-1 text-[11px] py-1.5 border border-borde-light rounded-lg hover:border-rojo/50 text-gris hover:text-rojo">{t('common.rename')}</button>}
                    {canEdit && <button onClick={() => setConfirmDelete(g)} className="w-8 text-[11px] py-1.5 border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo flex items-center justify-center">×</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={showNew} onClose={() => { setShowNew(false); setSelectedPresets([]) }} title={t('groups.new')}>
        <div className="space-y-3">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()}
            placeholder={t('groups.name_placeholder')} className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rojo" />
          {can('checklistEnabled') && (
            <PresetChecklistSelector onSelectionChange={setSelectedPresets} />
          )}
          <div className="flex gap-3 justify-end">
            <button onClick={() => { setShowNew(false); setSelectedPresets([]) }} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={create} disabled={!newName.trim()} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!rename} onClose={() => setRename(null)} title={t('common.rename')}>
        <div className="space-y-3">
          <input autoFocus value={renameVal} onChange={e => setRenameVal(e.target.value)}
            className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-rojo" />
          <div className="flex gap-3 justify-end">
            <button onClick={() => setRename(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={() => { if (rename && renameVal.trim()) updateGroup(rename.id, renameVal.trim()); setRename(null) }} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('common.delete')}>
        <p className="text-sm text-negro/80 mb-4">{t('groups.delete_confirm')} <strong>{confirmDelete?.name}</strong>?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
          <button onClick={() => { deleteGroup(confirmDelete!.id); setConfirmDelete(null) }} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.delete')}</button>
        </div>
      </Modal>

      {/* Upgrade — límite de grupos Free */}
      <Modal open={showUpgrade} onClose={() => setShowUpgrade(false)} title="">
        <UpgradeGate
          requiredPlan="solo_pro"
          featureName={t('groups.title')}
          headline={t('upgrade.groups_headline')}
          description={t('upgrade.groups_desc')}
          ctaText={t('upgrade.cta_solo_pro')}
          lightBg
        />
      </Modal>
    </div>
  )
}
