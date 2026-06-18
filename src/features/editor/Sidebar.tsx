import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { FORMATION_CARDS } from '@/lib/formations'
import { FormationCardButton } from './FormationCard'
import type { DancerLevel } from '@/types'
import { LEVEL_META, LEVEL_OPACITY, LEVEL_SCALE } from '@/types'
import { ARTICLES } from '@/data/articles'
import clsx from 'clsx'

export function Sidebar() {
  const { t } = useTranslation()
  const [showArticles, setShowArticles] = useState(false)
  const {
    rotateAll, mirrorH, mirrorV, scaleFormation,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    showZones, setShowZones,
    snapEnabled, setSnapEnabled,
    selectedIds, scenes, activeSceneId,
    setColor, setShape, setMultiLevel,
  } = useEditorStore()

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const selectedDancers = (activeScene?.dancers ?? []).filter(d => selectedIds.includes(d.id))

  const heading = (label: string) => (
    <div className="text-[10px] font-semibold text-dorado uppercase tracking-widest mt-4 mb-2 first:mt-0">
      {label}
    </div>
  )

  const sideBtn = (label: string, onClick: () => void) => (
    <button
      key={label}
      onClick={onClick}
      className="w-full text-left px-2.5 py-1.5 text-xs text-blanco-calido border border-borde rounded-md
                 hover:border-dorado/60 hover:text-dorado transition-colors mb-1"
    >
      {label}
    </button>
  )

  const toggle = (label: string, checked: boolean, onChange: (v: boolean) => void) => (
    <label key={label} className="flex items-center gap-2.5 cursor-pointer mb-2 text-xs text-blanco-calido/80 hover:text-blanco-calido">
      <div
        onClick={() => onChange(!checked)}
        className={clsx('w-8 h-4 rounded-full transition-colors relative cursor-pointer', checked ? 'bg-dorado' : 'bg-surface-3')}
      >
        <div className={clsx('absolute top-0.5 w-3 h-3 rounded-full bg-negro transition-transform', checked ? 'translate-x-4' : 'translate-x-0.5')} />
      </div>
      {label}
    </label>
  )

  return (
    <aside className="w-48 shrink-0 border-r border-borde bg-negro overflow-y-auto p-3 text-sm flex flex-col">

      {/* ── Panel de selección múltiple ─────────────────────────── */}
      {selectedDancers.length > 1 && (
        <div className="mb-3 p-2.5 rounded-lg border border-dorado/30 bg-dorado/5">
          <div className="text-[10px] text-dorado uppercase tracking-wider mb-2">
            {selectedDancers.length} bailarines seleccionados
          </div>

          {/* Color en bloque */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] text-gris">Color</span>
            <input
              type="color"
              defaultValue={selectedDancers[0]?.color ?? '#C9A961'}
              onChange={e => setColor(selectedIds, e.target.value)}
              className="w-7 h-6 rounded cursor-pointer border border-borde bg-transparent p-0.5"
            />
          </div>

          {/* Forma en bloque */}
          <div className="flex items-center gap-1 mb-2">
            <span className="text-[10px] text-gris mr-1">Forma</span>
            {(['circle', 'square', 'triangle'] as const).map(sh => (
              <button
                key={sh}
                onClick={() => setShape(selectedIds, sh)}
                className="flex-1 py-1 text-xs border border-borde rounded hover:border-dorado/50 hover:text-dorado transition-colors text-gris"
              >
                {sh === 'circle' ? '●' : sh === 'square' ? '■' : '▲'}
              </button>
            ))}
          </div>

          {/* Nivel en bloque */}
          <div className="flex gap-1">
            {(Object.entries(LEVEL_META) as [DancerLevel, typeof LEVEL_META[DancerLevel]][]).map(([lv, meta]) => (
              <button
                key={lv}
                onClick={() => setMultiLevel(selectedIds, lv)}
                title={meta.label}
                className="flex-1 py-1.5 text-xs border border-borde rounded hover:border-dorado/50 hover:text-dorado transition-colors text-gris flex flex-col items-center"
              >
                <span style={{ opacity: LEVEL_OPACITY[lv], transform: `scale(${LEVEL_SCALE[lv]})` }}>
                  {meta.emoji}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Formaciones ──────────────────────────────────────────── */}
      {heading(t('editor.sidebar.formations'))}
      {FORMATION_CARDS.map(card => (
        <FormationCardButton
          key={card.id}
          card={card}
          id={card.id === 'triangle' ? 'btn-triangle' : undefined}
        />
      ))}

      {/* ── Transformar ──────────────────────────────────────────── */}
      {heading(t('editor.sidebar.transform'))}
      {sideBtn(t('editor.sidebar.rotate_minus'), () => rotateAll(-15))}
      {sideBtn(t('editor.sidebar.rotate_plus'), () => rotateAll(15))}
      {sideBtn(t('editor.sidebar.mirror_h'), mirrorH)}
      {sideBtn(t('editor.sidebar.mirror_v'), mirrorV)}
      {sideBtn(t('editor.sidebar.scale_up'), () => scaleFormation(1.15))}
      {sideBtn(t('editor.sidebar.scale_down'), () => scaleFormation(0.87))}

      {/* ── Vista ────────────────────────────────────────────────── */}
      {heading(t('editor.sidebar.view'))}
      {toggle(t('editor.sidebar.show_grid'), showGrid, setShowGrid)}
      {toggle(t('editor.sidebar.show_labels'), showLabels, setShowLabels)}
      {toggle(t('editor.sidebar.show_zones'), showZones, setShowZones)}
      {toggle(t('editor.sidebar.snap'), snapEnabled, setSnapEnabled)}

      {/* ── Leyenda de niveles ───────────────────────────────────── */}
      {heading('Niveles')}
      <div className="space-y-1 mb-2">
        {(Object.entries(LEVEL_META) as [DancerLevel, typeof LEVEL_META[DancerLevel]][]).map(([lv, meta]) => (
          <div key={lv} className="flex items-center gap-2 text-xs text-blanco-calido/70">
            <div
              className="w-4 h-4 rounded-full bg-dorado shrink-0"
              style={{ opacity: LEVEL_OPACITY[lv], transform: `scale(${LEVEL_SCALE[lv]})` }}
            />
            <span>{meta.emoji} {meta.label}</span>
            <span className="text-gris/50 text-[10px]">
              {Math.round(LEVEL_OPACITY[lv] * 100)}%
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-gris/40 mb-2">Doble click en bailarín para editar nivel</p>

      {/* ── Aprender más ─────────────────────────────────────────── */}
      <button
        onClick={() => setShowArticles(v => !v)}
        className="flex items-center justify-between w-full text-[10px] font-semibold text-dorado uppercase tracking-widest mt-4 mb-1 hover:text-dorado-oscuro transition-colors"
      >
        {t('articles.section_title')}
        <span className="text-gris/40">{showArticles ? '▲' : '▼'}</span>
      </button>

      {showArticles && (
        <div className="space-y-1 mb-2">
          {ARTICLES.map(a => (
            <a
              key={a.titleKey}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-[10px] text-gris/70 hover:text-dorado transition-colors leading-snug py-0.5"
            >
              {t(a.titleKey)} ↗
            </a>
          ))}
        </div>
      )}
    </aside>
  )
}
