import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { SIZE_OPTIONS } from '@/types'
import { toggleLanguage } from '@/i18n'
import clsx from 'clsx'

interface Props {
  onToggleAudio: () => void
  showAudio: boolean
  audioLocked?: boolean
  onToggleStats: () => void
  showStats: boolean
  statsLocked?: boolean
  onToggleChecklist: () => void
  showChecklist: boolean
  checklistLocked?: boolean
  onToggleMembers: () => void
  showMembers: boolean
  membersLocked?: boolean
  onPlayAnimation: () => void
  isAnimating: boolean
  onStopAnimation: () => void
  animationDuration: number
  onAnimationDurationChange: (ms: number) => void
  onShare?: () => void
  maxDancers?: number
}

export function Toolbar({
  onToggleAudio, showAudio, audioLocked,
  onToggleStats, showStats, statsLocked,
  onToggleChecklist, showChecklist, checklistLocked,
  onToggleMembers, showMembers, membersLocked,
  onPlayAnimation, isAnimating, onStopAnimation,
  animationDuration, onAnimationDurationChange,
  onShare, maxDancers = Infinity,
}: Props) {
  const { t, i18n } = useTranslation()
  const {
    tool, setTool,
    newColor, setNewColor,
    newSize, setNewSize,
    newDancerCount, setNewDancerCount,
    selectedIds, deleteSelected, clearAll,
    setSize,
    undo, redo,
    scenes, activeSceneId,
  } = useEditorStore()

  // Tamaño: setea el default para nuevos integrantes Y, si hay selección,
  // se aplica también a los integrantes seleccionados en el canvas.
  function pickSize(size: number) {
    setNewSize(size)
    if (selectedIds.length > 0) setSize(selectedIds, size)
  }

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancerCount = activeScene?.dancers.length ?? 0
  const limitReached = dancerCount >= maxDancers

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

      {/* Herramienta */}
      <button className={btn(tool === 'select')} onClick={() => setTool('select')} title={t('editor.tool_select_hint')}>
        ↖ {t('editor.tool_select')}
      </button>
      <button
        className={clsx(btn(tool === 'add'), limitReached && 'opacity-40 cursor-not-allowed')}
        onClick={() => !limitReached && setTool('add')}
        title={limitReached
          ? t('plan.member_limit_reached', { limit: maxDancers === Infinity ? '∞' : maxDancers })
          : t('editor.tool_add_hint')}
      >
        + {t('editor.tool_add')}
      </button>

      {sep}

      {/* Tamaño visual — 4.1 */}
      <span className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em]">{t('editor.toolbar.size')}</span>
      {SIZE_OPTIONS.map(s => (
        <button
          key={s.value}
          onClick={() => pickSize(s.value)}
          title={`${s.label} (radio ${s.value}px)`}
          className={clsx(
            'flex items-center gap-1.5 rounded-[5px] px-[10px] py-[5px] border text-[11px] transition-colors',
            newSize === s.value
              ? 'bg-surface-2 border-borde-hover text-blanco-calido font-semibold'
              : 'border-borde text-blanco-calido/70 hover:border-borde-hover hover:text-blanco-calido',
          )}
        >
          <span
            className="rounded-full bg-current inline-block shrink-0"
            style={{ width: s.value * 0.75, height: s.value * 0.75, minWidth: 6, minHeight: 6 }}
          />
          {s.label}
        </button>
      ))}

      {sep}

      {/* Color */}
      <span className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em]">{t('editor.toolbar.color')}</span>
      <input
        id="color-picker"
        type="color"
        value={newColor}
        onChange={e => setNewColor(e.target.value)}
        className="w-7 h-7 rounded cursor-pointer border border-borde bg-transparent p-0.5"
        title={t('editor.toolbar.color')}
      />

      {sep}

      {/* Cantidad */}
      <span className="text-[9px] font-semibold text-gris/50 uppercase tracking-[0.1em]">{t('editor.toolbar.dancers')}</span>
      <input
        type="number"
        value={newDancerCount}
        min={1}
        max={50}
        onChange={e => setNewDancerCount(Number(e.target.value))}
        className="w-12 bg-negro border border-borde rounded px-2 py-1.5 text-xs text-blanco-calido
                   focus:outline-none focus:border-dorado"
      />

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

      {/* Audio */}
      <button
        onClick={onToggleAudio}
        className={clsx(btn(showAudio && !audioLocked), audioLocked && 'opacity-50')}
        title={audioLocked ? t('editor.toolbar.audio_locked') : t('editor.toolbar.audio_title')}
      >
        🎵 Audio{audioLocked && ' 🔒'}
      </button>

      {/* Estadísticas */}
      <button
        onClick={onToggleStats}
        className={clsx(btn(showStats && !statsLocked), statsLocked && 'opacity-50')}
        title={statsLocked ? t('editor.toolbar.stats_locked') : t('editor.toolbar.stats_title')}
      >
        ◎ Stats{statsLocked && ' 🔒'}
      </button>

      {/* Checklist */}
      <button
        onClick={onToggleChecklist}
        className={clsx(btn(showChecklist && !checklistLocked), checklistLocked && 'opacity-50')}
        title={checklistLocked ? t('editor.toolbar.checklist_locked') : t('editor.toolbar.checklist_title')}
      >
        ☑ {t('editor.toolbar.checklist')}{checklistLocked && ' 🔒'}
      </button>

      {/* Integrantes */}
      <button
        onClick={onToggleMembers}
        className={clsx(btn(showMembers && !membersLocked), membersLocked && 'opacity-50')}
        title={membersLocked ? t('editor.toolbar.members_panel_locked') : t('editor.toolbar.members_panel_title')}
      >
        ◉ {t('editor.toolbar.members_panel')}{membersLocked && ' 🔒'}
      </button>

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
