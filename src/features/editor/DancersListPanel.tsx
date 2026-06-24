import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import clsx from 'clsx'

const SHAPE_ICONS: Record<string, string> = {
  circle:   '●',
  square:   '■',
  triangle: '▲',
}

interface Props { onClose: () => void }

export function DancersListPanel({ onClose }: Props) {
  const { t } = useTranslation()
  const { can, features } = usePlan()
  const { scenes, activeSceneId, selectedIds, select } = useEditorStore()

  const canView    = can('membersEnabled')
  const showNames  = features.membersEnabled   // mirrors StageCanvas showMemberNames

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancers     = activeScene?.dancers ?? []
  const inScene     = dancers.filter(d => d.active !== false).length

  if (!canView) {
    return (
      <div className="absolute top-3 right-3 z-20 w-72 bg-negro border border-borde rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em]">{t('editor.toolbar.checklist')}</span>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
        <UpgradeGate requiredPlan="solo_pro" featureName={t('editor.toolbar.checklist_title')} className="pb-4"
          headline={t('upgrade.members_headline')}
          description={t('upgrade.members_desc')}
          ctaText={t('upgrade.cta_solo_pro')} />
      </div>
    )
  }

  return (
    <div className="absolute top-3 right-3 z-20 w-72 bg-negro border border-borde rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-borde/40 shrink-0">
        <div>
          <span className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em]">{t('editor.toolbar.checklist')}</span>
          <p className="text-[10px] text-gris/40 mt-0.5">
            {inScene} {t('members.count')} {t('scenes.in_stage')}
          </p>
        </div>
        <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
      </div>

      {/* Empty state */}
      {dancers.length === 0 && (
        <p className="text-xs text-gris/40 text-center py-8 px-4">
          Sin integrantes en esta escena.
        </p>
      )}

      {/* Dancer rows */}
      {dancers.length > 0 && (
        <ul className="overflow-y-auto flex-1 py-1.5">
          {dancers.map((dancer, idx) => {
            const isSelected = selectedIds.includes(dancer.id)
            const isOut      = dancer.active === false
            const dotColor   = dancer.leader ? '#C9A961' : dancer.color
            const displayName = showNames ? dancer.name : String(idx + 1)

            return (
              <li key={dancer.id}>
                <button
                  onClick={() => select(dancer.id, false)}
                  className={clsx(
                    'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-blanco-calido/5 border-l-2',
                    isSelected ? 'border-dorado bg-dorado/5' : 'border-transparent',
                    isOut && 'opacity-40',
                  )}
                >
                  {/* Color + leader */}
                  <div className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/20" style={{ backgroundColor: dotColor }} />

                  {/* Name */}
                  <span className={clsx(
                    'text-xs flex-1 truncate',
                    isSelected ? 'text-blanco-calido' : 'text-blanco-calido/70',
                  )}>
                    {displayName}
                    {dancer.leader && <span className="ml-1 text-dorado text-[9px]">★</span>}
                  </span>

                  {/* Shape */}
                  <span className="text-[10px] text-gris/40 shrink-0" title={dancer.shape}>
                    {SHAPE_ICONS[dancer.shape] ?? '●'}
                  </span>

                  {/* Level */}
                  <span className="text-[9px] text-gris/40 shrink-0 w-14 text-right truncate">
                    {t(`levels.${dancer.level}`)}
                  </span>

                  {/* Out-of-scene badge */}
                  {isOut && (
                    <span className="text-[8px] text-gris/30 shrink-0">Fuera</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
