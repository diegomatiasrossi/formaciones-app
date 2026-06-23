import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { DEFAULT_CHECKLIST, TRAVEL_CHECKLIST } from '@/data/checklist'
import type { ChecklistItem } from '@/types'

interface Props {
  onSelectionChange: (selected: string[]) => void
}

export function PresetChecklistSelector({ onSelectionChange }: Props) {
  const { t } = useTranslation()
  const [checked, setChecked] = useState<Set<string>>(new Set())

  function toggle(label: string) {
    setChecked(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      onSelectionChange([...next])
      return next
    })
  }

  const row = (item: ChecklistItem) => (
    <div
      key={item.id}
      onClick={() => toggle(item.label)}
      className="flex items-center gap-2.5 cursor-pointer"
    >
      <div className={[
        'w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors',
        checked.has(item.label) ? 'bg-rojo border-rojo text-blanco' : 'border-borde-light hover:border-rojo',
      ].join(' ')}>
        {checked.has(item.label) && <span className="text-[9px]">✓</span>}
      </div>
      <span className="text-sm text-negro/80">{item.label}</span>
    </div>
  )

  return (
    <div className="border-t border-borde-light pt-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gris mb-0.5">
        {t('activities.suggested_tasks')}
      </p>
      <p className="text-[10px] text-gris/60 mb-2">{t('activities.suggested_tasks_hint')}</p>
      <div className="space-y-3 max-h-56 overflow-y-auto">
        <div className="space-y-1.5">
          {DEFAULT_CHECKLIST.map(row)}
        </div>

        {/* Categoría: viaje / competencia internacional */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-dorado-oscuro mb-1.5 pt-1 border-t border-borde-light/60">
            {t('activities.suggested_tasks_travel')}
          </p>
          <div className="space-y-1.5">
            {TRAVEL_CHECKLIST.map(row)}
          </div>
        </div>
      </div>
    </div>
  )
}
