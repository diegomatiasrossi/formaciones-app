import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrewStore } from '@/store/crewStore'
import { useProjectStore } from '@/store/projectStore'
import { useAuth } from '@/features/auth/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { Modal } from '@/components/ui/Modal'
import { Logo } from '@/components/ui/Logo'
import { ModuleNav } from '@/components/ui/ModuleNav'
import { ActivitiesPanel } from '@/components/ui/ActivitiesPanel'
import { PresetChecklistSelector } from '@/components/ui/PresetChecklistSelector'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { nameSchema, firstErrorKey } from '@/lib/validation'
import type { CrewEvent } from '@/types'
import clsx from 'clsx'

const FREE_LIMIT = 3

export function EventosPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, groups, loading, fetchAll, createEvent, deleteEvent, createActivity } = useCrewStore()
  const { projects, fetchProjects, linkProjectToEvent } = useProjectStore()
  const { can, features } = usePlan()
  const activeOrgId = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.orgId : null)
  const wsRole = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.role : null)
  const canEdit = wsRole === null || wsRole === 'admin' || wsRole === 'editor'
  const isFree = features.maxProjects !== Infinity && activeOrgId === null
  const atLimit = isFree && events.length >= FREE_LIMIT

  const [showNew, setShowNew] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showAssignProject, setShowAssignProject] = useState(false)
  const [form, setForm] = useState({ name: '', eventDate: '', location: '', groupId: '' })
  const [newError, setNewError] = useState('')
  const [selectedPresets, setSelectedPresets] = useState<string[]>([])
  const [active, setActive] = useState<CrewEvent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CrewEvent | null>(null)

  useEffect(() => { if (user) { fetchAll(); fetchProjects() } }, [user, fetchAll, fetchProjects, activeOrgId])

  async function create() {
    if (!form.name.trim() || !canEdit || atLimit) return
    const parsed = nameSchema.safeParse({ name: form.name })
    if (!parsed.success) { setNewError(t(firstErrorKey(parsed)!)); return }
    setNewError('')
    const newEvent = await createEvent({
      name: form.name.trim(),
      eventDate: form.eventDate || undefined,
      location: form.location || undefined,
      groupId: form.groupId || null,
    })
    if (newEvent && selectedPresets.length > 0) {
      await Promise.all(
        selectedPresets.map(title => createActivity(title, 'event', newEvent.id, true))
      )
    }
    setForm({ name: '', eventDate: '', location: '', groupId: '' })
    setSelectedPresets([])
    setShowNew(false)
  }

  const projectForEvent = (eventId: string) => projects.find(p => (p as { eventId?: string }).eventId === eventId)

  // ── Detalle de evento ────────────────────────────────────────────────────────
  if (active) {
    const linkedProject = projectForEvent(active.id)
    const group = groups.find(g => g.id === active.groupId)
    return (
      <div className="min-h-screen bg-crema text-negro">
        <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10 backdrop-blur-sm">
          <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
          <button onClick={() => setActive(null)} className="text-xs text-gris hover:text-negro">← {t('events.title')}</button>
        </header>
        <main className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-2xl font-semibold mb-1">{active.name}</h1>
          <div className="flex gap-3 text-sm text-gris mb-6 flex-wrap">
            {active.eventDate && <span>📅 {active.eventDate}</span>}
            {active.location && <span>📍 {active.location}</span>}
            {group && <span>⬢ {group.name}</span>}
          </div>

          {/* Vínculo a Formaciones */}
          <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gris mb-3">{t('events.formation')}</h3>
            {linkedProject ? (
              <div className="space-y-2">
                <button onClick={() => navigate(`/editor/${linkedProject.id}`)} className="flex items-center gap-3 w-full text-left p-3 rounded-lg border border-borde-light hover:border-rojo/50 transition-colors">
                  <span className="text-2xl text-dorado">⬡</span>
                  <div>
                    <div className="font-semibold text-sm">{linkedProject.name}</div>
                    <div className="text-xs text-gris">{t('events.open_formation')} →</div>
                  </div>
                </button>
                <button
                  onClick={() => setShowAssignProject(true)}
                  className="w-full text-center text-[11px] text-gris hover:text-rojo transition-colors py-1"
                >
                  {t('events.assign_existing_project')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <button onClick={() => navigate(`/projects?eventId=${active.id}`)} className="w-full p-3 rounded-lg border border-dashed border-borde-light hover:border-rojo text-sm text-gris hover:text-rojo transition-colors">
                  + {t('events.create_formation')}
                </button>
                <button onClick={() => setShowAssignProject(true)} className="w-full p-3 rounded-lg border border-dashed border-dorado/40 hover:border-dorado text-sm text-gris hover:text-dorado-oscuro transition-colors">
                  ⬡ {t('events.assign_existing_project')}
                </button>
              </div>
            )}
          </div>

          {/* Actividades del evento */}
          <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft">
            <ActivitiesPanel contextType="event" contextId={active.id} />
          </div>
        </main>

        {/* Modal — Asignar proyecto existente */}
        <Modal open={showAssignProject} onClose={() => setShowAssignProject(false)} title={t('events.choose_project')}>
          {projects.length === 0 ? (
            <p className="text-sm text-gris py-4 text-center">{t('events.no_projects_available')}</p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {projects.map(p => {
                const isLinked = p.eventId === active.id
                return (
                  <button
                    key={p.id}
                    onClick={async () => {
                      await linkProjectToEvent(p.id, isLinked ? null : active.id)
                      setShowAssignProject(false)
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isLinked
                        ? 'border-rojo bg-rojo/5 text-negro'
                        : 'border-borde-light hover:border-rojo/40 hover:bg-rojo/3',
                    )}
                  >
                    <span className="text-lg text-dorado shrink-0">⬡</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{p.name}</div>
                      {p.groupName && <div className="text-[10px] text-gris truncate">{p.groupName}</div>}
                    </div>
                    {isLinked && <span className="text-[10px] text-rojo shrink-0">✓ vinculado</span>}
                  </button>
                )
              })}
            </div>
          )}
        </Modal>
      </div>
    )
  }

  // ── Lista de eventos ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-crema text-negro">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="opacity-90"><Logo size={28} /></button>
        <button onClick={() => navigate('/projects')} className="text-xs text-gris hover:text-negro">← {t('nav.projects')}</button>
      </header>
      <ModuleNav active="events" />
      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t('events.title')}</h1>
            {isFree && <p className="text-xs text-gris mt-0.5">{t('upgrade.free_count', { count: events.length, limit: FREE_LIMIT })}</p>}
          </div>
          {canEdit && <button onClick={() => atLimit ? setShowUpgrade(true) : setShowNew(true)} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg shadow-soft hover:-translate-y-0.5 transition-all">+ {t('events.new')}</button>}
        </div>

        {loading && <p className="text-gris text-sm">{t('common.loading')}</p>}

        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-rojo">◈</div>
            <h2 className="text-base font-semibold mb-2">{t('events.empty')}</h2>
            {canEdit && <button onClick={() => atLimit ? setShowUpgrade(true) : setShowNew(true)} className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg mt-4">{t('events.create_first')}</button>}
          </div>
        )}

        {!loading && events.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map(e => {
              const linked = projectForEvent(e.id)
              return (
                <div key={e.id} className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft hover:shadow-card hover:border-rojo/30 transition-all">
                  <button onClick={() => setActive(e)} className="text-left w-full">
                    <div className="text-2xl text-rojo mb-2">◈</div>
                    <div className="font-semibold">{e.name}</div>
                    <div className="text-xs text-gris mt-1 space-y-0.5">
                      {e.eventDate && <div>📅 {e.eventDate}</div>}
                      {e.location && <div className="truncate">📍 {e.location}</div>}
                    </div>
                    <div className="mt-2">
                      {linked
                        ? <span className="text-[9px] px-2 py-0.5 rounded-full border border-dorado/40 text-dorado-oscuro bg-dorado/5">⬡ {t('events.has_formation')}</span>
                        : <span className="text-[9px] px-2 py-0.5 rounded-full border border-borde-light text-gris">{t('events.no_formation')}</span>}
                    </div>
                  </button>
                  <div className="flex gap-2 mt-3 pt-3 border-t border-borde-light">
                    <button onClick={() => setActive(e)} className="flex-1 text-[11px] py-1.5 border border-borde-light rounded-lg hover:border-rojo text-gris hover:text-rojo">{t('events.open')}</button>
                    {canEdit && <button onClick={() => setConfirmDelete(e)} className="w-8 text-[11px] py-1.5 border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo flex items-center justify-center">×</button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={showNew} onClose={() => { setShowNew(false); setSelectedPresets([]) }} title={t('events.new')}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('events.name')} <span className="text-rojo">*</span></label>
            <input autoFocus value={form.name} onChange={e => { setForm(f => ({ ...f, name: e.target.value })); if (newError) setNewError('') }}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
            {newError && <p className="text-rojo text-xs mt-1.5">{newError}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('events.date')}</label>
              <input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
            </div>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('events.location')}</label>
              <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('events.group')}</label>
            <select value={form.groupId} onChange={e => setForm(f => ({ ...f, groupId: e.target.value }))}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo">
              <option value="">—</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          {can('checklistEnabled') && (
            <PresetChecklistSelector onSelectionChange={setSelectedPresets} />
          )}
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => { setShowNew(false); setSelectedPresets([]) }} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={create} disabled={!form.name.trim()} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('common.delete')}>
        <p className="text-sm text-negro/80 mb-4">{t('events.delete_confirm')} <strong>{confirmDelete?.name}</strong>?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
          <button onClick={() => { deleteEvent(confirmDelete!.id); setConfirmDelete(null) }} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.delete')}</button>
        </div>
      </Modal>

      {/* Upgrade — límite de eventos Free */}
      <Modal open={showUpgrade} onClose={() => setShowUpgrade(false)} title="">
        <UpgradeGate
          requiredPlan="solo_pro"
          featureName={t('events.title')}
          headline={t('upgrade.events_headline')}
          description={t('upgrade.events_desc')}
          ctaText={t('upgrade.cta_solo_pro')}
          lightBg
        />
      </Modal>
    </div>
  )
}
