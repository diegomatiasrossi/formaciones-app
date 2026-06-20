import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Stage, Layer, Circle, Rect, RegularPolygon, Group, Text } from 'react-konva'
import { useProjectStore } from '@/store/projectStore'
import { useAuth } from '@/features/auth/useAuth'
import { useAnimationPlayer } from '@/hooks/useAnimationPlayer'
import { ShareModal } from '@/components/ui/ShareModal'
import type { Project } from '@/types'
import { LEVEL_OPACITY, LEVEL_SCALE } from '@/types'

const STAGE_W = Math.min(window.innerWidth - 32, 480)
const STAGE_H = Math.round(STAGE_W * 9 / 16)

export function MobilePreviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { projects, fetchProjectById } = useProjectStore()
  const [sceneIndex, setSceneIndex] = useState(0)
  const [showShare, setShowShare] = useState(false)
  const fetchingRef = useRef(false)

  useEffect(() => {
    if (!user || !projectId) return
    const project = projects.find(p => p.id === projectId)
    // Fetch full data when not in store or only a lightweight list summary
    if (!project || project._sceneCount !== undefined) {
      if (!fetchingRef.current) {
        fetchingRef.current = true
        fetchProjectById(projectId).finally(() => { fetchingRef.current = false })
      }
    }
  }, [user, projectId, projects, fetchProjectById])

  const project = projects.find(p => p.id === projectId) as Project | undefined
  const isReady = !!project && project._sceneCount === undefined
  const scenes = isReady ? project.scenes : []

  const { isPlaying, currentFrame, play, stop } = useAnimationPlayer(scenes, 1500, STAGE_W, STAGE_H)

  const activeScene = scenes[sceneIndex]

  if (!isReady) {
    return (
      <div className="min-h-screen bg-negro flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const displayDancers = isPlaying && currentFrame
    ? currentFrame.dancers
    : (activeScene?.dancers.filter(d => d.active !== false) ?? []).map(d => ({ id: d.id, x: d.x, y: d.y, opacity: 1 }))

  const allDancers = activeScene?.dancers ?? []

  const scaleX = STAGE_W / 720
  const scaleY = STAGE_H / 480

  return (
    <div className="min-h-screen bg-negro text-blanco-calido flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-borde/50 flex items-center gap-3">
        <button onClick={() => navigate('/projects')} className="text-gris hover:text-blanco-calido text-sm">←</button>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{project.name}</div>
          {(project.groupName || project.choreographyName) && (
            <div className="text-[10px] text-gris/50 truncate">
              {[project.groupName, project.choreographyName].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <button
          onClick={() => setShowShare(true)}
          className="text-xs text-dorado/80 hover:text-dorado transition-colors border border-dorado/30 rounded px-2 py-1"
        >
          ↗ Compartir
        </button>
      </header>

      {/* Banner */}
      <div className="bg-[#1a1400] border-b border-dorado/20 px-4 py-2 text-[11px] text-dorado/70 text-center">
        Editá desde tu computadora — acá podés visualizar y compartir.
      </div>

      {/* Canvas */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="rounded-xl border border-borde/40 bg-[#0a0a0a] overflow-hidden shadow-xl">
          <Stage width={STAGE_W} height={STAGE_H} listening={false}>
            <Layer>
              <Rect
                x={40 * scaleX} y={40 * scaleY}
                width={(720 - 80) * scaleX} height={(480 - 80) * scaleY}
                fill="transparent" stroke="#C9A961" strokeWidth={0.5} dash={[4, 3]} cornerRadius={2}
                listening={false}
              />
              {displayDancers.map(frame => {
                const d = allDancers.find(x => x.id === frame.id)
                if (!d) return null
                const levelScale = LEVEL_SCALE[d.level]
                const levelOpacity = LEVEL_OPACITY[d.level]
                const r = d.size
                const shapeProps = { fill: d.color }
                return (
                  <Group
                    key={d.id}
                    x={frame.x * scaleX}
                    y={frame.y * scaleY}
                    scaleX={levelScale * scaleX}
                    scaleY={levelScale * scaleY}
                    opacity={frame.opacity * levelOpacity}
                    listening={false}
                  >
                    {d.shape === 'circle' && <Circle x={0} y={0} radius={r} {...shapeProps} />}
                    {d.shape === 'square' && <Rect x={-r} y={-r} width={r * 2} height={r * 2} cornerRadius={3} {...shapeProps} />}
                    {d.shape === 'triangle' && <RegularPolygon x={0} y={0} sides={3} radius={r} {...shapeProps} />}
                    <Text
                      x={-20 / levelScale} y={-r / levelScale - 14}
                      width={40 / levelScale}
                      text={d.name}
                      fontSize={9}
                      fill="#aaa"
                      align="center"
                      listening={false}
                    />
                  </Group>
                )
              })}
            </Layer>
          </Stage>
        </div>
      </main>

      {/* Controles */}
      <div className="border-t border-borde/50 px-4 py-4 space-y-3">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { stop(); setSceneIndex(i => Math.max(0, i - 1)) }}
            disabled={sceneIndex === 0 || isPlaying}
            className="w-10 h-10 rounded-lg border border-borde text-gris hover:text-dorado disabled:opacity-30 flex items-center justify-center"
          >←</button>

          {isPlaying ? (
            <button
              onClick={stop}
              className="px-6 py-2 bg-dorado/20 border border-dorado/40 text-dorado rounded-lg text-sm"
            >⏸</button>
          ) : (
            <button
              onClick={play}
              disabled={scenes.length < 2}
              className="px-6 py-2 bg-dorado hover:bg-dorado-oscuro text-negro rounded-lg text-sm font-medium disabled:opacity-40"
            >▶ Reproducir</button>
          )}

          <button
            onClick={() => { stop(); setSceneIndex(i => Math.min(scenes.length - 1, i + 1)) }}
            disabled={sceneIndex === scenes.length - 1 || isPlaying}
            className="w-10 h-10 rounded-lg border border-borde text-gris hover:text-dorado disabled:opacity-30 flex items-center justify-center"
          >→</button>
        </div>

        {!isPlaying && (
          <div className="flex items-center justify-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSceneIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${i === sceneIndex ? 'bg-dorado' : 'bg-borde'}`}
                title={s.name}
              />
            ))}
          </div>
        )}
      </div>

      {showShare && <ShareModal project={project} onClose={() => setShowShare(false)} />}
    </div>
  )
}
