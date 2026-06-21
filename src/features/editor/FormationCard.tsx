import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { FormationCard as FC } from '@/types'
import { useEditorStore } from '@/store/editorStore'
import { usePlan } from '@/hooks/usePlan'
import type { FormationId } from '@/types'
import { getArticlesByTopics } from '@/data/articles'
import clsx from 'clsx'

interface Props { card: FC; id?: string }

export function FormationCardButton({ card, id }: Props) {
  const { t } = useTranslation()
  const [showInfo, setShowInfo] = useState(false)
  const [hovered, setHovered] = useState(false)
  const applyFormation = useEditorStore(s => s.applyFormation)
  const { features } = usePlan()

  return (
    <div id={id} className="relative mb-0.5 group">
      <div className="flex items-center gap-0.5">
        <button
          className={clsx(
            'flex-1 text-left px-2 py-1.5 text-xs text-blanco-calido border rounded-md transition-all',
            'hover:border-dorado/60 hover:text-dorado hover:bg-dorado/5',
            showInfo ? 'border-dorado/40 bg-dorado/5' : 'border-borde',
          )}
          onClick={() => applyFormation(card.id as FormationId, undefined, features.maxDancers)}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <span className="mr-1.5 text-gris/70 font-mono">{card.icon}</span>
          {t(card.nameKey)}
        </button>

        <button
          onClick={() => setShowInfo(v => !v)}
          className={clsx(
            'w-5 h-5 flex items-center justify-center text-[10px] rounded border transition-colors shrink-0',
            showInfo ? 'border-dorado text-dorado bg-dorado/10' : 'border-borde text-gris/50 hover:border-dorado/40 hover:text-dorado/60',
          )}
          title="Ficha pedagógica"
        >i</button>
      </div>

      {/* Tooltip rápido en hover — 4.3 */}
      {hovered && !showInfo && (
        <div className="absolute left-full ml-2 top-0 z-50 w-52 bg-[#1a1a1a] border border-borde/60 rounded-lg p-2.5 pointer-events-none shadow-xl">
          <div className="text-[10px] font-semibold text-dorado mb-1">{t(card.nameKey)}</div>
          <div className="text-[10px] text-blanco-calido/70 leading-relaxed">{t(card.advantages[0])}</div>
          <div className="text-[9px] text-gris/50 mt-1 italic">{t(card.feeling)}</div>
        </div>
      )}

      {/* Ficha pedagógica expandida */}
      {showInfo && (
        <div className="bg-[#1a1a1a] border border-borde/60 rounded-lg p-3 mb-1 text-xs space-y-2.5">
          <div>
            <div className="text-dorado/60 text-[9px] uppercase tracking-wider mb-0.5">Sensación</div>
            <div className="text-blanco-calido/80 leading-relaxed">{t(card.feeling)}</div>
          </div>
          <div>
            <div className="text-green-400/60 text-[9px] uppercase tracking-wider mb-0.5">Ventajas</div>
            {card.advantages.map(k => (
              <div key={k} className="text-blanco-calido/70 flex gap-1 items-start">
                <span className="text-green-400/40 shrink-0 mt-0.5">·</span>
                <span className="leading-relaxed">{t(k)}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-red-400/60 text-[9px] uppercase tracking-wider mb-0.5">Riesgos</div>
            {card.risks.map(k => (
              <div key={k} className="text-blanco-calido/60 flex gap-1 items-start">
                <span className="text-red-400/40 shrink-0 mt-0.5">·</span>
                <span className="leading-relaxed">{t(k)}</span>
              </div>
            ))}
          </div>
          <div>
            <div className="text-dorado/60 text-[9px] uppercase tracking-wider mb-0.5">Mejor uso</div>
            <div className="text-blanco-calido/70 leading-relaxed">{t(card.bestUse)}</div>
          </div>
          {(() => {
            const related = getArticlesByTopics(['formaciones'])
            return related.length > 0 ? (
              <a
                href={related[0].url}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-[10px] text-dorado/60 hover:text-dorado transition-colors pt-1 border-t border-borde/30"
              >
                {t('articles.read_more')}
              </a>
            ) : null
          })()}
        </div>
      )}
    </div>
  )
}
