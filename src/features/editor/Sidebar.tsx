import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { FORMATION_CARDS } from '@/lib/formations'
import { FormationCardButton } from './FormationCard'
import type { DancerLevel } from '@/types'
import { LEVEL_META, LEVEL_OPACITY, LEVEL_SCALE } from '@/types'
import clsx from 'clsx'

export function Sidebar() {
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1280)
  // Acordeón: todas las secciones colapsadas por defecto, varias pueden estar
  // abiertas a la vez (no exclusivo).
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const toggleSection = (id: string) => setOpen(o => ({ ...o, [id]: !o[id] }))
  const {
    rotateAll, mirrorH, mirrorV, scaleFormation,
    showGrid, setShowGrid,
    showLabels, setShowLabels,
    showZones, setShowZones,
    snapEnabled, setSnapEnabled,
    selectedIds, scenes, activeSceneId,
    setColor, setMultiLevel,
  } = useEditorStore()

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const selectedDancers = (activeScene?.dancers ?? []).filter(d => selectedIds.includes(d.id))

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

  // Sección colapsable del acordeón.
  const section = (id: string, title: string, content: React.ReactNode) => {
    const isOpen = !!open[id]
    return (
      <div key={id} className="border-b border-borde/40">
        <button
          onClick={() => toggleSection(id)}
          className="flex items-center justify-between w-full py-2.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-gris/60 hover:text-dorado transition-colors"
        >
          <span>{title}</span>
          <span className="text-gris/40 text-[8px]">{isOpen ? '▼' : '▶'}</span>
        </button>
        {isOpen && <div className="pb-3">{content}</div>}
      </div>
    )
  }

  if (collapsed) {
    return (
      <aside className="w-10 shrink-0 border-r border-borde bg-negro flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="text-gris hover:text-dorado transition-colors p-1"
          title={t('editor.sidebar.expand')}
        >
          ›
        </button>
        <div className="w-px h-3 bg-borde" />
        <button onClick={() => rotateAll(-15)} className="text-gris hover:text-dorado text-xs" title="−15°">↶</button>
        <button onClick={() => rotateAll(15)}  className="text-gris hover:text-dorado text-xs" title="+15°">↷</button>
        <button onClick={mirrorH} className="text-gris hover:text-dorado text-xs" title="Espejo H">↔</button>
        <button onClick={mirrorV} className="text-gris hover:text-dorado text-xs" title="Espejo V">↕</button>
      </aside>
    )
  }

  return (
    <aside className="w-48 shrink-0 border-r border-borde bg-negro overflow-y-auto p-3 text-sm flex flex-col">

      {/* ── Botón colapsar ─────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(true)}
        className="self-end text-gris hover:text-dorado transition-colors text-sm mb-1"
        title={t('editor.sidebar.collapse')}
      >‹</button>

      {/* ── Panel de selección múltiple (contextual, siempre visible) ─── */}
      {selectedDancers.length > 1 && (
        <div className="mb-3 p-2.5 rounded-lg border border-dorado/30 bg-dorado/5">
          <div className="text-[10px] text-dorado uppercase tracking-wider mb-2">
            {selectedDancers.length} integrantes seleccionados
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

          {/* Nivel en bloque */}
          <div className="flex gap-1">
            {(Object.entries(LEVEL_META) as [DancerLevel, typeof LEVEL_META[DancerLevel]][]).map(([lv, meta]) => (
              <button
                key={lv}
                onClick={() => setMultiLevel(selectedIds, lv)}
                title={meta.label}
                className="flex-1 py-1.5 text-sm border border-borde rounded hover:border-dorado/50 hover:text-dorado transition-colors text-gris flex flex-col items-center"
              >
                <span style={{ opacity: LEVEL_OPACITY[lv], transform: `scale(${LEVEL_SCALE[lv]})` }}>
                  {meta.emoji}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Acordeón ─────────────────────────────────────────────── */}
      {section('formations', t('editor.sidebar.formations'),
        FORMATION_CARDS.map(card => (
          <FormationCardButton
            key={card.id}
            card={card}
            id={card.id === 'triangle' ? 'btn-triangle' : undefined}
          />
        )),
      )}

      {section('transform', t('editor.sidebar.transform'), (
        <>
          {sideBtn(t('editor.sidebar.rotate_minus'), () => rotateAll(-15))}
          {sideBtn(t('editor.sidebar.rotate_plus'), () => rotateAll(15))}
          {sideBtn(t('editor.sidebar.mirror_h'), mirrorH)}
          {sideBtn(t('editor.sidebar.mirror_v'), mirrorV)}
          {sideBtn(t('editor.sidebar.scale_up'), () => scaleFormation(1.15))}
          {sideBtn(t('editor.sidebar.scale_down'), () => scaleFormation(0.87))}
        </>
      ))}

      {section('view', t('editor.sidebar.view'), (
        <>
          {toggle(t('editor.sidebar.show_grid'), showGrid, setShowGrid)}
          {toggle(t('editor.sidebar.show_labels'), showLabels, setShowLabels)}
          {toggle(t('editor.sidebar.show_zones'), showZones, setShowZones)}
          {toggle(t('editor.sidebar.snap'), snapEnabled, setSnapEnabled)}
        </>
      ))}

      {/* ── Leyenda de niveles (pie de sidebar, estática) ──────────── */}
      <div className="mt-auto pt-3">
        <div className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em] mb-2">Niveles</div>
        <div className="space-y-1 mb-2">
          {(Object.entries(LEVEL_META) as [DancerLevel, typeof LEVEL_META[DancerLevel]][]).map(([lv, meta]) => (
            <div key={lv} className="flex items-center gap-2 text-xs text-blanco-calido/70">
              <div
                className="w-4 h-4 rounded-full bg-dorado shrink-0"
                style={{ opacity: LEVEL_OPACITY[lv], transform: `scale(${LEVEL_SCALE[lv]})` }}
              />
              <span className="text-sm">{meta.emoji}</span>
              <span className="font-medium">{meta.label}</span>
              <span className="text-gris/50 text-[10px]">
                {Math.round(LEVEL_OPACITY[lv] * 100)}%
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gris/40">Doble click en integrante para editar nivel</p>
      </div>
    </aside>
  )
}
