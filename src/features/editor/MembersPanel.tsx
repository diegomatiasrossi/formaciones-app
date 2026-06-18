import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import type { Member } from '@/types'
import { nanoid } from '@/store/nanoid'
import clsx from 'clsx'

interface Props {
  onClose: () => void
}

const EMPTY_FORM: Omit<Member, 'id'> = {
  name: '',
  lastName: '',
  styles: '',
  music: '',
  notes: '',
}

export function MembersPanel({ onClose }: Props) {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, updateProjectMeta } = useProjectStore()
  const { features } = usePlan()

  const project = projects.find(p => p.id === projectId)
  const members = project?.members ?? []

  const [editing, setEditing] = useState<Member | null>(null)
  const [form, setForm] = useState<Omit<Member, 'id'>>(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)

  function openNew() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setShowForm(true)
  }

  function openEdit(m: Member) {
    setEditing(m)
    setForm({ name: m.name, lastName: m.lastName, styles: m.styles, music: m.music ?? '', notes: m.notes ?? '' })
    setShowForm(true)
  }

  function saveForm() {
    if (!project || !form.name.trim()) return
    let updated: Member[]
    if (editing) {
      updated = members.map(m => m.id === editing.id ? { ...editing, ...form } : m)
    } else {
      updated = [...members, { id: nanoid(), ...form }]
    }
    updateProjectMeta(project.id, { members: updated })
    setShowForm(false)
    setEditing(null)
  }

  function deleteMember(id: string) {
    if (!project) return
    updateProjectMeta(project.id, { members: members.filter(m => m.id !== id) })
  }

  if (!features.membersEnabled) {
    return (
      <div className="absolute top-3 right-3 z-20 w-80 bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] text-dorado uppercase tracking-widest">Integrantes</span>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
        <UpgradeGate requiredPlan="starter" featureName="Base de datos de integrantes" className="pb-4" />
      </div>
    )
  }

  return (
    <div className="absolute top-3 right-3 z-20 w-80 bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-borde/40 shrink-0">
        <div>
          <span className="text-[10px] text-dorado uppercase tracking-widest">Integrantes</span>
          <p className="text-[10px] text-gris/50 mt-0.5">{members.length} persona{members.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNew}
            className="px-2.5 py-1 text-[10px] bg-dorado/10 hover:bg-dorado/20 text-dorado rounded-md transition-colors border border-dorado/30"
          >
            + Agregar
          </button>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-borde/40 bg-[#161616] shrink-0 space-y-2">
          <div className="text-[10px] text-dorado uppercase tracking-wider mb-2">
            {editing ? 'Editar integrante' : 'Nuevo integrante'}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              autoFocus
              placeholder="Nombre *"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className={clsx(inputCls, !form.name.trim() && 'border-red-800/50')}
            />
            <input
              placeholder="Apellido"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
              className={inputCls}
            />
          </div>
          <input
            placeholder="Estilos (hip hop, afro, jazz...)"
            value={form.styles}
            onChange={e => setForm(f => ({ ...f, styles: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Música favorita (opcional)"
            value={form.music}
            onChange={e => setForm(f => ({ ...f, music: e.target.value }))}
            className={inputCls}
          />
          <textarea
            placeholder="Notas (opcional)"
            value={form.notes}
            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            rows={2}
            className={clsx(inputCls, 'resize-none')}
          />
          <div className="flex gap-2 justify-end pt-1">
            <button
              onClick={() => { setShowForm(false); setEditing(null) }}
              className="px-3 py-1 text-xs text-gris hover:text-blanco-calido transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveForm}
              disabled={!form.name.trim()}
              className="px-3 py-1 text-xs bg-dorado hover:bg-dorado-oscuro text-negro font-medium rounded-md transition-colors disabled:opacity-50"
            >
              {editing ? 'Guardar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="overflow-y-auto flex-1">
        {members.length === 0 && !showForm && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-gris/40 text-xs mb-3">Sin integrantes todavía</p>
            <button
              onClick={openNew}
              className="text-dorado/70 text-xs hover:text-dorado transition-colors"
            >
              + Agregar el primero
            </button>
          </div>
        )}
        {members.map(m => (
          <div
            key={m.id}
            className="flex items-start gap-3 px-4 py-3 border-b border-borde/20 hover:bg-blanco-calido/3 group"
          >
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-blanco-calido/90">
                {m.name} {m.lastName}
              </div>
              {m.styles && (
                <div className="text-[10px] text-dorado/60 mt-0.5 truncate">{m.styles}</div>
              )}
              {m.notes && (
                <div className="text-[10px] text-gris/40 mt-0.5 truncate">{m.notes}</div>
              )}
            </div>
            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => openEdit(m)}
                className="text-[10px] text-gris hover:text-dorado transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-borde"
              >
                editar
              </button>
              <button
                onClick={() => deleteMember(m.id)}
                className="text-[10px] text-gris/40 hover:text-red-400 transition-colors px-1.5 py-0.5 rounded border border-transparent hover:border-red-800/40"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const inputCls = 'w-full bg-negro border border-borde rounded-md px-2.5 py-1.5 text-xs text-blanco-calido focus:outline-none focus:border-dorado placeholder:text-gris/30'
