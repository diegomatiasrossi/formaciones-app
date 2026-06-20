import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useCrewStore } from '@/store/crewStore'
import { useProjectStore } from '@/store/projectStore'
import { useAuth } from '@/features/auth/useAuth'
import { Modal } from '@/components/ui/Modal'
import { Logo } from '@/components/ui/Logo'
import { ModuleNav } from '@/components/ui/ModuleNav'
import { ActivitiesPanel } from '@/components/ui/ActivitiesPanel'
import type { CrewEvent } from '@/types'

export function EventosPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { events, groups, loading, fetchAll, createEvent, deleteEvent } = useCrewStore()
  const { projects, fetchProjects } = useProjectStore()

  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({ name: '', eventDate: '', location: '', groupId: '' })
  const [active, setActive] = useState<CrewEvent | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<CrewEvent | null>(null)

  useEffect(() => { if (user) { fetchAll(); fetchProjects() } }, [user, fetchAll, fetchProjects])

  async function create() {
    if (!form.name.trim()) return
    await createEvent({
      name: form.name.trim(),
      eventDate: form.eventDate || undefined,
      location: form.location || undefined,
      groupId: form.groupId || null,
    })
    setForm({ name: '', eventDate: '', location: '', groupId: '' })
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
              <button onClick={() => navigate(`/editor/${linkedProject.id}`)} className="flex items-center gap-3 w-full text-left p-3 rounded-lg border border-borde-light hover:border-rojo/50 transition-colors">
                <span className="text-2xl text-dorado">⬡</span>
                <div>
                  <div className="font-semibold text-sm">{linkedProject.name}</div>
                  <div className="text-xs text-gris">{t('events.open_formation')} →</div>
                </div>
              </button>
            ) : (
              <button onClick={() => navigate(`/projects?eventId=${active.id}`)} className="w-full p-3 rounded-lg border border-dashed border-borde-light hover:border-rojo text-sm text-gris hover:text-rojo transition-colors">
                + {t('events.create_formation')}
              </button>
            )}
          </div>

          {/* Actividades del evento */}
          <div className="bg-blanco border border-borde-light rounded-2xl p-5 shadow-soft">
            <ActivitiesPanel contextType="event" contextId={active.id} />
          </div>
        </main>
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
          <h1 className="text-xl font-semibold tracking-wide">{t('events.title')}</h1>
          <button onClick={() => setShowNew(true)} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg shadow-soft hover:-translate-y-0.5 transition-all">+ {t('events.new')}</button>
        </div>

        {loading && <p className="text-gris text-sm">{t('common.loading')}</p>}

        {!loading && events.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-rojo">◈</div>
            <h2 className="text-base font-semibold mb-2">{t('events.empty')}</h2>
            <button onClick={() => setShowNew(true)} className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg mt-4">{t('events.create_first')}</button>
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
                    <button onClick={() => setConfirmDelete(e)} className="w-8 text-[11px] py-1.5 border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo flex items-center justify-center">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('events.new')}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('events.name')} <span className="text-rojo">*</span></label>
            <input autoFocus value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
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
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
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
    </div>
  )
}
