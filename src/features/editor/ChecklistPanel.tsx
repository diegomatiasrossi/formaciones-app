import { useParams } from 'react-router-dom'
import { useProjectStore } from '@/store/projectStore'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { DEFAULT_CHECKLIST } from '@/data/checklist'
import clsx from 'clsx'

interface Props {
  onClose: () => void
}

function weeksLeft(endDate?: string): string | null {
  if (!endDate) return null
  const diff = new Date(endDate).getTime() - Date.now()
  if (diff < 0) return 'Evento pasado'
  const weeks = Math.ceil(diff / (7 * 24 * 3600 * 1000))
  return `${weeks} semana${weeks !== 1 ? 's' : ''} restante${weeks !== 1 ? 's' : ''}`
}

export function ChecklistPanel({ onClose }: Props) {
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, updateProjectMeta } = useProjectStore()
  const { features } = usePlan()

  const project = projects.find(p => p.id === projectId)
  const checklist = project?.checklist ?? DEFAULT_CHECKLIST
  const done = checklist.filter(i => i.done).length
  const total = checklist.length
  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const remaining = weeksLeft(project?.endDate)

  function toggleItem(id: string) {
    if (!project) return
    const updated = checklist.map(item =>
      item.id === id ? { ...item, done: !item.done } : item
    )
    updateProjectMeta(project.id, { checklist: updated })
  }

  if (!features.checklistEnabled) {
    return (
      <div className="absolute top-3 right-3 z-20 w-72 bg-negro border border-borde rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] text-dorado uppercase tracking-widest">Checklist</span>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
        <UpgradeGate requiredPlan="pro" featureName="Checklist de producción" className="pb-4" />
      </div>
    )
  }

  return (
    <div className="absolute top-3 right-3 z-20 w-72 bg-negro border border-borde rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-borde/40 shrink-0">
        <div>
          <span className="text-[10px] text-dorado uppercase tracking-widest">Checklist</span>
          {project?.name && (
            <p className="text-[10px] text-gris/50 mt-0.5 truncate max-w-[180px]">{project.name}</p>
          )}
        </div>
        <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none ml-2">×</button>
      </div>

      {/* Progress */}
      <div className="px-4 py-3 border-b border-borde/40 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-gris/60">{done} / {total} completados</span>
          <span className="text-[10px] text-dorado font-medium">{pct}%</span>
        </div>
        <div className="w-full h-1 bg-borde rounded-full overflow-hidden">
          <div
            className="h-full bg-dorado rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {remaining && (
          <p className="text-[10px] text-gris/50 mt-1.5">{remaining}</p>
        )}
      </div>

      {/* Items */}
      <ul className="overflow-y-auto flex-1 py-2">
        {checklist.map((item, idx) => (
          <li key={item.id}>
            <button
              onClick={() => toggleItem(item.id)}
              className={clsx(
                'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-blanco-calido/5',
                item.done ? 'text-gris/40' : 'text-blanco-calido/80',
              )}
            >
              <div className={clsx(
                'w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors',
                item.done ? 'bg-dorado/30 border-dorado/50' : 'border-borde hover:border-dorado/50',
              )}>
                {item.done && <span className="text-dorado text-[9px] leading-none">✓</span>}
              </div>
              <span className={clsx('text-xs leading-snug', item.done && 'line-through')}>
                <span className="text-gris/30 mr-1.5 font-mono">{String(idx + 1).padStart(2, '0')}</span>
                {item.label}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {pct === 100 && (
        <div className="px-4 py-3 border-t border-borde/40 shrink-0">
          <p className="text-[10px] text-dorado/70 text-center">Proyecto listo para el evento</p>
        </div>
      )}
    </div>
  )
}
