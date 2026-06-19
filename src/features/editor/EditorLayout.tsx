import { useCallback, useRef, useState } from 'react'
import { Toolbar } from './Toolbar'
import { Sidebar } from './Sidebar'
import { StageCanvas } from './StageCanvas'
import { StatisticsPanel } from './StatisticsPanel'
import { ChecklistPanel } from './ChecklistPanel'
import { MembersPanel } from './MembersPanel'
import { ScenePanel } from '@/features/scenes/ScenePanel'
import { AudioPanel } from '@/features/audio/AudioPanel'
import { useAnimationPlayer, interpolateScenes, ease, type AnimFrame } from '@/hooks/useAnimationPlayer'
import { useEditorStore } from '@/store/editorStore'
import { usePlan } from '@/hooks/usePlan'
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcutsModal'

const AUDIO_TRANSITION_MS = 450
const STAGE_PADDING = 40

interface Props {
  projectName: string
  groupName?: string
  choreographyName?: string
  stageRatio?: import('@/types').StageRatio
  onBack: () => void
  onSave: () => void
  onShare?: () => void
  isSaving?: boolean
}

export function EditorLayout({ projectName, groupName, choreographyName, stageRatio, onBack, onSave, onShare, isSaving }: Props) {
  const { scenes, setActiveScene, stageWidth, stageHeight } = useEditorStore()
  const { features } = usePlan()
  const [showAudio, setShowAudio]       = useState(false)
  const [showStats, setShowStats]       = useState(false)
  const [showChecklist, setShowChecklist] = useState(false)
  const [showMembers, setShowMembers]   = useState(false)
  const [showShortcuts, setShowShortcuts] = useState(false)
  const [transitionDuration, setTransitionDuration] = useState(1500)

  const sw = stageWidth  - STAGE_PADDING * 2
  const sh = stageHeight - STAGE_PADDING * 2

  const { isPlaying, currentFrame, play, stop } = useAnimationPlayer(scenes, transitionDuration, sw, sh)

  // ── Audio-sync animated transition ──────────────────────────────
  const audioRafRef   = useRef<number>(0)
  const [audioFrame, setAudioFrame] = useState<AnimFrame | null>(null)

  const handleAudioSceneChange = useCallback((targetSceneId: string) => {
    const currentId = useEditorStore.getState().activeSceneId
    if (targetSceneId === currentId) return

    cancelAnimationFrame(audioRafRef.current)

    const fromScene = useEditorStore.getState().scenes.find(s => s.id === currentId)
    const toScene   = useEditorStore.getState().scenes.find(s => s.id === targetSceneId)

    if (!fromScene || !toScene) {
      setActiveScene(targetSceneId)
      return
    }

    const startTime = performance.now()

    function tick(now: number) {
      const t      = Math.min(1, (now - startTime) / AUDIO_TRANSITION_MS)
      const eased  = ease(t)
      const dancers = interpolateScenes(fromScene!, toScene!, eased, sw, sh)
      setAudioFrame({ dancers, sceneName: toScene!.name, progress: t })

      if (t < 1) {
        audioRafRef.current = requestAnimationFrame(tick)
      } else {
        setAudioFrame(null)
        setActiveScene(targetSceneId)
      }
    }
    audioRafRef.current = requestAnimationFrame(tick)
  }, [setActiveScene, sw, sh])

  const animOverride = isPlaying ? currentFrame : (audioFrame ?? null)

  return (
    <div className="flex flex-col h-screen bg-negro text-blanco-calido overflow-hidden">

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2.5 border-b border-borde shrink-0 bg-negro/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="text-gris hover:text-blanco-calido text-sm transition-colors shrink-0 flex items-center gap-1"
          >
            ← <span className="hidden sm:inline">Proyectos</span>
          </button>
          <div className="w-px h-4 bg-borde shrink-0" />
          <div className="min-w-0">
            <span className="text-sm font-medium tracking-wide truncate block" title={projectName}>
              {projectName}
            </span>
            {(groupName || choreographyName) && (
              <span className="text-[10px] text-gris/50 tracking-widest uppercase block truncate">
                {[groupName, choreographyName].filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-dorado tracking-widest hidden md:block">Crewficina</span>
          <div className="w-px h-4 bg-borde mx-1" />
          <button
            onClick={() => setShowShortcuts(true)}
            className="text-[10px] text-gris hover:text-dorado transition-colors tracking-wider"
            title="Atajos de teclado"
          >⌨</button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-dorado hover:bg-dorado-oscuro text-negro text-xs font-semibold
                       rounded-md transition-colors disabled:opacity-60 flex items-center gap-1"
          >
            {isSaving ? '...' : '↑ Guardar'}
          </button>
        </div>
      </header>

      {/* Toolbar */}
      <Toolbar
        onToggleAudio={() => setShowAudio(v => !v)}
        showAudio={showAudio}
        audioLocked={!features.audioEnabled}
        onToggleStats={() => setShowStats(v => !v)}
        showStats={showStats}
        statsLocked={!features.statsEnabled}
        onToggleChecklist={() => { setShowChecklist(v => !v); setShowMembers(false) }}
        showChecklist={showChecklist}
        checklistLocked={!features.checklistEnabled}
        onToggleMembers={() => { setShowMembers(v => !v); setShowChecklist(false) }}
        showMembers={showMembers}
        membersLocked={!features.membersEnabled}
        onPlayAnimation={play}
        isAnimating={isPlaying}
        onStopAnimation={stop}
        animationDuration={transitionDuration}
        onAnimationDurationChange={setTransitionDuration}
        onShare={onShare}
        maxDancers={features.maxDancers}
      />

      {/* Indicador de animación activa */}
      {isPlaying && currentFrame && (
        <div className="absolute top-[104px] left-1/2 -translate-x-1/2 z-30 pointer-events-none
                        bg-negro/80 backdrop-blur-sm border border-dorado/30 rounded-full
                        px-4 py-1.5 text-xs text-dorado flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-dorado animate-pulse" />
          {currentFrame.sceneName}
          <span className="text-gris">{Math.round(currentFrame.progress * 100)}%</span>
        </div>
      )}

      {/* Cuerpo principal */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 overflow-hidden relative">
            <StageCanvas animationOverride={animOverride} stageRatio={stageRatio} maxDancers={features.maxDancers} />
            {showStats && <StatisticsPanel onClose={() => setShowStats(false)} locked={!features.statsEnabled} />}
            {showChecklist && <ChecklistPanel onClose={() => setShowChecklist(false)} />}
            {showMembers && <MembersPanel onClose={() => setShowMembers(false)} />}
          </div>

          {showAudio && <AudioPanel onSceneChange={handleAudioSceneChange} locked={!features.audioEnabled} />}

          <ScenePanel canonLocked={!features.canonEnabled} />
        </main>
      </div>

      {showShortcuts && <KeyboardShortcutsModal onClose={() => setShowShortcuts(false)} />}
    </div>
  )
}
