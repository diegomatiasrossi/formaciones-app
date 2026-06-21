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
import type { CrewMember, MemberType, MemberLevel } from '@/types'
import clsx from 'clsx'

function findPossibleDuplicates(
  newMember: { firstName: string; lastName?: string; nickname?: string },
  existingMembers: CrewMember[],
): CrewMember[] {
  const norm = (s?: string) => (s ?? '').toLowerCase().trim()
  return existingMembers.filter(existing => {
    const sameFirst    = norm(existing.firstName) === norm(newMember.firstName) && norm(newMember.firstName) !== ''
    const sameLast     = newMember.lastName  && existing.lastName  && norm(existing.lastName)  === norm(newMember.lastName)
    const sameNickname = newMember.nickname  && existing.nickname  && norm(existing.nickname)  === norm(newMember.nickname)
    return sameFirst || sameLast || sameNickname
  })
}

const EMPTY: Omit<CrewMember, 'id'> = {
  firstName: '', lastName: '', nickname: '', phone: '', email: '',
  type: 'stage', level: undefined, role: '', notes: '',
}

const STAGE_ROLES = ['member', 'captain']
const TEAM_ROLES  = ['choreographer', 'logistics', 'other']
const LEVELS: MemberLevel[] = ['beginner', 'intermediate', 'advanced', 'professional']

export function IntegrantesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { can } = usePlan()
  const namesVisible = can('membersEnabled')
  const activeOrgId = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.orgId : null)
  const inOrgContext = activeOrgId !== null
  const {
    members, groups, loading, fetchAll,
    createMember, updateMember, deleteMember,
    setMemberGroups, groupsOfMember,
  } = useCrewStore()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CrewMember | null>(null)
  const [form, setForm] = useState<Omit<CrewMember, 'id'>>(EMPTY)
  const [confirmDelete, setConfirmDelete] = useState<CrewMember | null>(null)
  const [groupModal, setGroupModal] = useState<CrewMember | null>(null)
  const [selGroups, setSelGroups] = useState<string[]>([])
  const [duplicates, setDuplicates] = useState<CrewMember[]>([])
  const [showDuplicateModal, setShowDuplicateModal] = useState(false)

  useEffect(() => { if (user) fetchAll() }, [user, fetchAll, activeOrgId])

  function openNew() { setEditing(null); setForm(EMPTY); setShowForm(true) }
  function openEdit(m: CrewMember) {
    setEditing(m)
    setForm({ firstName: m.firstName, lastName: m.lastName ?? '', nickname: m.nickname ?? '', phone: m.phone ?? '', email: m.email ?? '', type: m.type, level: m.level, role: m.role ?? '', notes: m.notes ?? '' })
    setShowForm(true)
  }

  async function save() {
    if (!form.firstName.trim()) return
    if (editing) {
      await updateMember(editing.id, form)
      setShowForm(false); setEditing(null)
      return
    }
    // Duplicate detection — only in org context
    if (inOrgContext) {
      const dupes = findPossibleDuplicates(form, members)
      if (dupes.length > 0) {
        setDuplicates(dupes)
        setShowDuplicateModal(true)
        return
      }
    }
    await createMember(form)
    setShowForm(false); setEditing(null)
  }

  async function confirmCreateNew() {
    await createMember(form)
    setShowDuplicateModal(false); setShowForm(false); setEditing(null); setDuplicates([])
  }

  function cancelDuplicate() {
    setShowDuplicateModal(false); setDuplicates([])
  }

  function openGroups(m: CrewMember) {
    setGroupModal(m)
    setSelGroups(groupsOfMember(m.id).map(g => g.id))
  }
  async function saveGroups() {
    if (!groupModal) return
    await setMemberGroups(groupModal.id, selGroups)
    setGroupModal(null)
  }

  const roles = form.type === 'stage' ? STAGE_ROLES : TEAM_ROLES

  return (
    <div className="min-h-screen bg-crema text-negro">
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light bg-crema/95 sticky top-0 z-10 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100"><Logo size={28} /></button>
        <button onClick={() => navigate('/projects')} className="text-xs text-gris hover:text-negro">← {t('nav.projects')}</button>
      </header>

      <ModuleNav active="members" />

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t('members.title')}</h1>
            {members.length > 0 && <p className="text-xs text-gris mt-0.5">{members.length} {t('members.count')}</p>}
          </div>
          <button onClick={openNew} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-soft">
            + {t('members.new')}
          </button>
        </div>

        {loading && <p className="text-gris text-sm">{t('common.loading')}</p>}

        {!loading && members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-dorado">◉</div>
            <h2 className="text-base font-semibold mb-2">{t('members.empty')}</h2>
            <button onClick={openNew} className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg mt-4">{t('members.create_first')}</button>
          </div>
        )}

        {!loading && members.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map(m => {
              const mGroups = groupsOfMember(m.id)
              return (
                <div key={m.id} className="bg-blanco border border-borde-light rounded-2xl p-4 shadow-soft hover:shadow-card transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{m.firstName} {m.lastName}</div>
                      {m.nickname && <div className="text-[11px] text-dorado-oscuro font-medium">"{m.nickname}"</div>}
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <span className={clsx('text-[9px] px-2 py-0.5 rounded-full border', m.type === 'stage' ? 'border-rojo/30 text-rojo bg-rojo/5' : 'border-dorado/40 text-dorado-oscuro bg-dorado/5')}>
                          {t(`members.type_${m.type}`)}
                        </span>
                        {m.level && <span className="text-[9px] px-2 py-0.5 rounded-full border border-borde-light text-gris">{t(`members.level_${m.level}`)}</span>}
                      </div>
                    </div>
                  </div>

                  {(m.phone || m.email) && (
                    <div className="mt-2 text-[11px] text-gris space-y-0.5">
                      {m.phone && <div>📞 {m.phone}</div>}
                      {m.email && <div className="truncate">✉ {m.email}</div>}
                    </div>
                  )}

                  {mGroups.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {mGroups.map(g => <span key={g.id} className="text-[9px] px-2 py-0.5 rounded bg-dorado/10 text-dorado-oscuro border border-dorado/20">{g.name}</span>)}
                    </div>
                  )}

                  <div className="flex gap-2 mt-3 pt-3 border-t border-borde-light">
                    <button onClick={() => openGroups(m)} className="flex-1 text-[11px] py-1.5 border border-borde-light rounded-lg hover:border-dorado text-gris hover:text-dorado-oscuro transition-colors">{t('members.groups_btn')}</button>
                    <button onClick={() => openEdit(m)} className="flex-1 text-[11px] py-1.5 border border-borde-light rounded-lg hover:border-rojo/50 text-gris hover:text-rojo transition-colors">{t('common.rename')}</button>
                    <button onClick={() => setConfirmDelete(m)} className="w-8 text-[11px] py-1.5 border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo flex items-center justify-center">×</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal form */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title={editing ? t('members.edit') : t('members.new')}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('members.first_name')} required value={form.firstName} onChange={v => setForm(f => ({ ...f, firstName: v }))} autoFocus lockedHint={!namesVisible ? t('plan.member_names_locked') : undefined} />
            <Field label={t('members.last_name')} value={form.lastName ?? ''} onChange={v => setForm(f => ({ ...f, lastName: v }))} lockedHint={!namesVisible ? t('plan.member_names_locked') : undefined} />
          </div>
          <Field label={t('members.nickname')} value={form.nickname ?? ''} onChange={v => setForm(f => ({ ...f, nickname: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('members.phone')} value={form.phone ?? ''} onChange={v => setForm(f => ({ ...f, phone: v }))} />
            <Field label={t('members.email')} value={form.email ?? ''} onChange={v => setForm(f => ({ ...f, email: v }))} />
          </div>
          {/* Tipo */}
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('members.type')}</label>
            <div className="flex gap-2">
              {(['stage', 'team'] as MemberType[]).map(tp => (
                <button key={tp} type="button" onClick={() => setForm(f => ({ ...f, type: tp, role: '' }))}
                  className={clsx('flex-1 py-2 rounded-lg border text-xs transition-all', form.type === tp ? 'border-rojo bg-rojo/8 text-rojo' : 'border-borde-light text-gris hover:border-gris')}>
                  {t(`members.type_${tp}`)}
                </button>
              ))}
            </div>
          </div>
          {/* Nivel */}
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('members.level')}</label>
            <select value={form.level ?? ''} onChange={e => setForm(f => ({ ...f, level: (e.target.value || undefined) as MemberLevel | undefined }))}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo">
              <option value="">—</option>
              {LEVELS.map(l => <option key={l} value={l}>{t(`members.level_${l}`)}</option>)}
            </select>
          </div>
          {/* Rol (condicional) */}
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('members.role')}</label>
            <select value={form.role ?? ''} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo">
              <option value="">—</option>
              {roles.map(r => <option key={r} value={r}>{t(`members.role_${r}`)}</option>)}
            </select>
          </div>
          {/* Notas */}
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('members.notes')}</label>
            <textarea value={form.notes ?? ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo resize-none" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={save} disabled={!form.firstName.trim()} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg disabled:opacity-40">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Modal grupos */}
      <Modal open={!!groupModal} onClose={() => setGroupModal(null)} title={t('members.assign_groups')}>
        <div className="space-y-3">
          {groups.length === 0 ? (
            <p className="text-sm text-gris">{t('members.no_groups_yet')}</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {groups.map(g => (
                <label key={g.id} className="flex items-center gap-3 p-2 rounded-lg border border-borde-light cursor-pointer hover:border-dorado/40">
                  <input type="checkbox" checked={selGroups.includes(g.id)}
                    onChange={e => setSelGroups(prev => e.target.checked ? [...prev, g.id] : prev.filter(x => x !== g.id))}
                    className="accent-rojo" />
                  <span className="text-sm">{g.name}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setGroupModal(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={saveGroups} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('common.delete')}>
        <p className="text-sm text-negro/80 mb-4">{t('members.delete_confirm')} <strong>{confirmDelete?.firstName} {confirmDelete?.lastName}</strong>?</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
          <button onClick={() => { deleteMember(confirmDelete!.id); setConfirmDelete(null) }} className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.delete')}</button>
        </div>
      </Modal>

      {/* Duplicate detection modal (org context only) */}
      <Modal open={showDuplicateModal} onClose={cancelDuplicate} title={t('org.possible_duplicate')}>
        <p className="text-sm text-gris mb-4">Encontramos integrantes con datos similares en esta organización:</p>
        <div className="space-y-2 mb-5 max-h-48 overflow-y-auto">
          {duplicates.map(d => (
            <div key={d.id} className="flex items-center gap-3 p-2.5 bg-crema rounded-lg border border-borde-light">
              <span className="text-dorado">◉</span>
              <div className="text-sm">
                <span className="font-medium">{d.firstName} {d.lastName}</span>
                {d.nickname && <span className="text-gris ml-2">"{d.nickname}"</span>}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={cancelDuplicate} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
          <button onClick={confirmCreateNew} className="px-4 py-2 border border-borde-light rounded-lg text-sm hover:border-rojo text-gris hover:text-rojo">
            {t('org.create_new_anyway')}
          </button>
        </div>
      </Modal>
    </div>
  )
}

function Field({ label, value, onChange, required, autoFocus, lockedHint }: { label: string; value: string; onChange: (v: string) => void; required?: boolean; autoFocus?: boolean; lockedHint?: string }) {
  return (
    <div>
      <label className="flex items-center gap-1 text-[10px] text-gris uppercase tracking-wider mb-1.5">
        {label} {required && <span className="text-rojo">*</span>}
        {lockedHint && <span title={lockedHint} className="text-gris/40 cursor-default select-none">🔒</span>}
      </label>
      <input autoFocus={autoFocus} type="text" value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo" />
    </div>
  )
}
