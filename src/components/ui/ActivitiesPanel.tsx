import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useCrewStore } from '@/store/crewStore'
import { usePlan } from '@/hooks/usePlan'
import { useWorkspaceStore } from '@/store/workspaceStore'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { checklistItemSchema, firstErrorKey } from '@/lib/validation'
import type { ActivityContext } from '@/types'
import clsx from 'clsx'

interface Props {
  contextType: ActivityContext
  contextId: string
}

export function ActivitiesPanel({ contextType, contextId }: Props) {
  const { t } = useTranslation()
  const { can } = usePlan()
  const wsRole = useWorkspaceStore(s => s.activeWorkspace.type === 'org' ? s.activeWorkspace.role : null)
  const canEdit = wsRole === null || wsRole === 'admin' || wsRole === 'editor'
  const { activitiesFor, createActivity, toggleActivity, deleteActivity } = useCrewStore()
  const [newTitle, setNewTitle] = useState('')
  const [addError, setAddError] = useState('')

  if (!can('checklistEnabled')) {
    return <UpgradeGate requiredPlan="solo_pro" featureName={t('activities.title')}
      headline={t('upgrade.activities_headline')}
      description={t('upgrade.activities_desc')}
      ctaText={t('upgrade.cta_solo_pro')}
      lightBg />
  }

  const items = activitiesFor(contextType, contextId)
  const done = items.filter(a => a.done).length

  async function add() {
    if (!newTitle.trim() || !canEdit) return
    const parsed = checklistItemSchema.safeParse(newTitle)
    if (!parsed.success) { setAddError(t(firstErrorKey(parsed)!)); return }
    setAddError('')
    await createActivity(newTitle.trim(), contextType, contextId, false)
    setNewTitle('')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gris">{t('activities.title')}</h3>
        {items.length > 0 && <span className="text-[10px] text-gris">{done}/{items.length}</span>}
      </div>

      {canEdit && (
        <div className="flex gap-2 mb-3">
          <input type="text" value={newTitle} onChange={e => { setNewTitle(e.target.value); if (addError) setAddError('') }}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('activities.placeholder')}
            className="flex-1 bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          <button onClick={add} className="px-3 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">+</button>
        </div>
      )}
      {addError && <p className="text-rojo text-[11px] mb-3 -mt-1">{addError}</p>}

      {items.length === 0 ? (
        <p className="text-xs text-gris/60 text-center py-6">{t('activities.empty')}</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(a => (
            <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-borde-light bg-blanco group">
              <button onClick={() => canEdit && toggleActivity(a.id)} disabled={!canEdit}
                className={clsx('w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors',
                  a.done ? 'bg-rojo border-rojo text-blanco' : 'border-borde-light hover:border-rojo',
                  !canEdit && 'cursor-default')}>
                {a.done && <span className="text-[11px]">✓</span>}
              </button>
              <span className={clsx('text-sm flex-1', a.done && 'line-through text-gris')}>{a.title}</span>
              {a.isPreset && <span className="text-[8px] text-dorado-oscuro bg-dorado/10 px-1.5 py-0.5 rounded">base</span>}
              {canEdit && <button onClick={() => deleteActivity(a.id)} className="text-gris/40 hover:text-rojo text-sm opacity-0 group-hover:opacity-100 transition-opacity">×</button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
