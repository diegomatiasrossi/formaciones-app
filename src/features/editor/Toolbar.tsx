import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { toggleLanguage } from '@/i18n'
import clsx from 'clsx'

interface Props {
  onToggleAudio: () => void
  showAudio: boolean
  audioLocked?: boolean
  audioComingSoon?: boolean
  onToggleStats: () => void
  showStats: boolean
  statsLocked?: boolean
  onToggleChecklist: () => void
  showChecklist: boolean
  checklistLocked?: boolean
  onPlayAnimation: () => void
  isAnimating: boolean
  onStopAnimation: () => void
  animationDuration: number
  onAnimationDurationChange: (ms: number) => void
  onShare?: () => void
  maxDancers?: number
}

export function Toolbar({
  onToggleAudio, showAudio, audioLocked, audioComingSoon,
  onToggleStats, showStats, statsLocked,
  onToggleChecklist, showChecklist, checklistLocked,
  onPlayAnimation, isAnimating, onStopAnimation,
  animationDuration, onAnimationDurationChange,
  onShare, maxDancers = Infinity,
}: Props) {
  const { t, i18n } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const {
    tool, setTool,
    selectedIds, deleteSelected, clearAll,
    undo, redo,
    scenes, activeSceneId,
  } = useEditorStore()

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancerCount = activeScene?.dancers.length ?? 0

  const btn = (active: boolean, extra?: string) =>
    clsx(
      'border rounded-[5px] px-[10px] py-[5px] text-[11px] transition-colors cursor-pointer select-none',
      active
        ? 'bg-surface-2 border-borde-hover text-blanco-calido font-semibold'
        : 'bg-transparent border-borde text-blanco-calido/70 hover:border-borde-hover hover:text-blanco-calido',
      extra,
    )

  const sep = <div className="w-px h-5 bg-borde mx-0.5 shrink-0" />

  return (
    <div className="flex flex-wrap md:flex-nowrap md:overflow-x-auto items-center gap-1.5 px-3 py-2 border-b border-borde bg-negro text-blanco-calido select-none shrink-0">

      {/* Herramienta — Selección (Agregar/Tamaño/Color/Cantidad viven en el Sidebar) */}
      <button className={btn(tool === 'select')} onClick={() => setTool('select')} title={t('editor.tool_select_hint')}>
        ↖ {t('editor.tool_select')}
      </button>

      {sep}

      {/* Undo / Redo */}
      <button className={btn(false)} onClick={undo} title={`${t('common.undo')} (Ctrl+Z)`}>↺ {t('common.undo')}</button>
      <button className={btn(false)} onClick={redo} title={`${t('common.redo')} (Ctrl+Shift+Z)`}>↻</button>

      {sep}

      {/* Borrar */}
      {selectedIds.length > 0 && (
        <button
          onClick={deleteSelected}
          className="px-2.5 py-1.5 rounded border border-red-800 text-red-400 hover:border-red-600 text-xs transition-colors"
        >
          ✕ ({selectedIds.length})
        </button>
      )}
      <button
        onClick={clearAll}
        className="px-2.5 py-1.5 rounded border border-borde text-gris hover:border-red-800 hover:text-red-400 text-xs transition-colors"
        title={t('editor.toolbar.clear_all')}
      >
        {t('editor.toolbar.clear_all')}
      </button>

      {sep}

      {/* Export PNG */}
      <button className={btn(false)} onClick={() => window.dispatchEvent(new Event('export-png'))}>
        ⬇ PNG
      </button>

      {sep}

      {/* Animación — 3.1 */}
      {isAnimating ? (
        <button onClick={onStopAnimation} className="px-2.5 py-1.5 rounded border border-red-700 text-red-400 text-xs hover:border-red-500 transition-colors">
          ⏹ Detener
        </button>
      ) : (
        <button
          id="btn-preview"
          onClick={onPlayAnimation}
          disabled={scenes.length < 2}
          className={clsx(btn(false), scenes.length < 2 && 'opacity-40 cursor-not-allowed')}
          title={scenes.length < 2 ? t('editor.preview.need_two_toolbar') : t('editor.toolbar.preview_title')}
        >
          ▶ Preview
        </button>
      )}
      {!isAnimating && (
        <input
          type="range"
          min={500} max={3000} step={100}
          value={animationDuration}
          onChange={e => onAnimationDurationChange(Number(e.target.value))}
          title={`${t('editor.toolbar.preview_title')}: ${animationDuration}ms`}
          className="w-16 accent-dorado"
        />
      )}

      {sep}

      {/* Audio / Stats / Lista — agrupados en un menú "⋯" */}
      <div className="relative">
        <button
          onClick={() => setMoreOpen(v => !v)}
          className={clsx(btn(moreOpen))}
          title={t('editor.toolbar.more')}
        >⋯</button>

        {moreOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMoreOpen(false)} />
            <div className="absolute right-0 top-full mt-1 z-20 w-44 bg-negro border border-borde rounded-lg shadow-card p-1 flex flex-col gap-0.5">
              {/* Audio */}
              <button
                onClick={() => { setMoreOpen(false); onToggleAudio() }}
                className={clsx(
                  'relative w-full text-left px-2 py-1.5 text-xs rounded transition-colors hover:bg-surface-2',
                  audioComingSoon ? 'text-blanco-calido/80' : audioLocked ? 'text-blanco-calido/40' : showAudio ? 'text-dorado' : 'text-blanco-calido/80',
                )}
                title={
                  audioComingSoon
                    ? t('editor.audio_coming_soon')
                    : audioLocked ? t('editor.toolbar.audio_locked') : t('editor.toolbar.audio_title')
                }
              >
                🎵 Audio{!audioComingSoon && audioLocked && ' 🔒'}
                {audioComingSoon && <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-dorado" aria-hidden="true" />}
              </button>

              {/* Estadísticas */}
              <button
                onClick={() => { setMoreOpen(false); onToggleStats() }}
                className={clsx(
                  'w-full text-left px-2 py-1.5 text-xs rounded transition-colors hover:bg-surface-2',
                  statsLocked ? 'text-blanco-calido/40' : showStats ? 'text-dorado' : 'text-blanco-calido/80',
                )}
                title={statsLocked ? t('editor.toolbar.stats_locked') : t('editor.toolbar.stats_title')}
              >
                ◎ Stats{statsLocked && ' 🔒'}
              </button>

              {/* Checklist */}
              <button
                onClick={() => { setMoreOpen(false); onToggleChecklist() }}
                className={clsx(
                  'w-full text-left px-2 py-1.5 text-xs rounded transition-colors hover:bg-surface-2',
                  checklistLocked ? 'text-blanco-calido/40' : showChecklist ? 'text-dorado' : 'text-blanco-calido/80',
                )}
                title={checklistLocked ? t('editor.toolbar.checklist_locked') : t('editor.toolbar.checklist_title')}
              >
                ☑ {t('editor.toolbar.checklist')}{checklistLocked && ' 🔒'}
              </button>
            </div>
          </>
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Contador X/límite (Free 10 · Pro 50 · Studio 50) */}
      {(() => {
        const displayLimit = maxDancers === Infinity ? 50 : maxDancers
        return (
          <span className={clsx(
            'text-xs font-medium tabular-nums',
            dancerCount > displayLimit ? 'text-red-400' : dancerCount >= displayLimit ? 'text-orange-400' : 'text-gris',
          )}>
            {dancerCount} / {displayLimit}
            {selectedIds.length > 0 && <span className="text-dorado"> · {selectedIds.length} sel.</span>}
          </span>
        )
      })()}

      {sep}

      {/* Compartir */}
      {onShare && (
        <button
          id="btn-share"
          onClick={onShare}
          className={clsx(btn(false), 'text-dorado/80 hover:text-dorado border-dorado/30 hover:border-dorado/60')}
          title={t('editor.toolbar.share_title')}
        >
          ↗ {t('editor.toolbar.share')}
        </button>
      )}

      {sep}

      {/* Idioma */}
      <button
        className="text-[10px] text-gris hover:text-dorado uppercase tracking-wider transition-colors"
        onClick={toggleLanguage}
      >
        {i18n.language === 'es' ? 'EN' : 'ES'}
      </button>
    </div>
  )
}
