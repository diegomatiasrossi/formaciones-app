import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Stage, Layer, Circle, Rect, RegularPolygon, Group, Text } from 'react-konva'
import { supabase } from '@/features/auth/supabaseClient'
import { useAnimationPlayer } from '@/hooks/useAnimationPlayer'
import type { Project } from '@/types'
import { LEVEL_OPACITY, LEVEL_SCALE } from '@/types'

const STAGE_W = 720
const STAGE_H = 480

export function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [sceneIndex, setSceneIndex] = useState(0)

  useEffect(() => {
    if (!token) return
    supabase
      .from('projects')
      .select('*')
      .eq('share_token', token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) { setNotFound(true); return }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = data as any
        const p: Project = {
          id: row.id,
          name: row.name,
          groupName: row.group_name ?? undefined,
          choreographyName: row.choreography_name ?? undefined,
          stageRatio: row.stage_ratio ?? '16:9',
          scenes: row.data?.scenes ?? [],
          activeSceneId: row.data?.activeSceneId ?? '',
          audioMarkers: row.data?.audioMarkers ?? [],
          shareToken: row.share_token,
          shareShowNames: row.share_show_names ?? true,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }
        setProject(p)
      })
  }, [token])

  const scenes = project?.scenes ?? []
  const { isPlaying, currentFrame, play, stop } = useAnimationPlayer(scenes, 1500, STAGE_W, STAGE_H)

  const activeScene = scenes[sceneIndex]
  const showNames = project?.shareShowNames ?? true

  if (notFound) {
    return (
      <div className="min-h-screen bg-negro flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div className="text-dorado text-4xl">⊘</div>
        <h1 className="text-blanco-calido text-xl font-light">Link no válido o expirado</h1>
        <p className="text-gris text-sm max-w-xs">
          Este link compartible fue revocado o nunca existió.
        </p>
        <a href="/" className="mt-4 text-xs text-dorado hover:text-dorado-oscuro transition-colors">
          Ir al inicio →
        </a>
      </div>
    )
  }

  if (!project) {
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

  function renderShape(d: typeof allDancers[0], x: number, y: number, opacity: number) {
    const levelScale = LEVEL_SCALE[d.level]
    const levelOpacity = LEVEL_OPACITY[d.level]
    const r = d.size
    const shapeProps = { fill: d.color }

    return (
      <Group key={d.id} x={x} y={y} scaleX={levelScale} scaleY={levelScale} opacity={opacity * levelOpacity} listening={false}>
        {d.shape === 'circle' && <Circle x={0} y={0} radius={r} {...shapeProps} />}
        {d.shape === 'square' && <Rect x={-r} y={-r} width={r * 2} height={r * 2} cornerRadius={3} {...shapeProps} />}
        {d.shape === 'triangle' && <RegularPolygon x={0} y={0} sides={3} radius={r} {...shapeProps} />}
        {showNames && (
          <Text
            x={-20 / levelScale} y={-r / levelScale - 14}
            width={40 / levelScale}
            text={d.name}
            fontSize={9}
            fill="#aaa"
            align="center"
            listening={false}
          />
        )}
      </Group>
    )
  }

  return (
    <div
      className="min-h-screen bg-negro text-blanco-calido flex flex-col select-none"
      onContextMenu={e => e.preventDefault()}
    >
      {/* Header */}
      <header className="px-6 py-4 border-b border-borde/50 flex items-center justify-between">
        <div>
          <div className="text-dorado tracking-[0.2em] text-xs font-light">FORMACIONES</div>
          {(project.groupName || project.choreographyName) && (
            <div className="text-gris/60 text-[10px] tracking-wider mt-0.5">
              {[project.groupName, project.choreographyName].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="text-sm font-medium text-blanco-calido/80">{project.name}</div>
      </header>

      {/* Canvas */}
      <main className="flex-1 flex items-center justify-center p-6 overflow-hidden">
        <div className="rounded-xl border border-borde/40 bg-[#0a0a0a] overflow-hidden shadow-2xl">
          <Stage width={STAGE_W} height={STAGE_H} listening={false}>
            <Layer>
              {/* Stage border */}
              <Rect
                x={40} y={40}
                width={STAGE_W - 80} height={STAGE_H - 80}
                fill="transparent"
                stroke="#C9A961"
                strokeWidth={0.5}
                dash={[4, 3]}
                cornerRadius={2}
                listening={false}
              />
              {displayDancers.map(frame => {
                const d = allDancers.find(x => x.id === frame.id)
                if (!d) return null
                return renderShape(d, frame.x, frame.y, frame.opacity)
              })}
            </Layer>
          </Stage>
        </div>
      </main>

      {/* Controles */}
      <div className="border-t border-borde/50 px-6 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => { stop(); setSceneIndex(i => Math.max(0, i - 1)) }}
            disabled={sceneIndex === 0 || isPlaying}
            className="w-9 h-9 rounded-lg border border-borde text-gris hover:text-dorado hover:border-dorado/50
                       transition-colors disabled:opacity-30 flex items-center justify-center text-sm"
          >←</button>

          {isPlaying ? (
            <button
              onClick={stop}
              className="px-6 py-2 bg-dorado/20 border border-dorado/40 text-dorado rounded-lg text-sm hover:bg-dorado/30 transition-colors"
            >
              ⏸ Pausar
            </button>
          ) : (
            <button
              onClick={play}
              disabled={scenes.length < 2}
              className="px-6 py-2 bg-dorado hover:bg-dorado-oscuro text-negro rounded-lg text-sm font-medium
                         transition-colors disabled:opacity-40"
            >
              ▶ Reproducir
            </button>
          )}

          <button
            onClick={() => { stop(); setSceneIndex(i => Math.min(scenes.length - 1, i + 1)) }}
            disabled={sceneIndex === scenes.length - 1 || isPlaying}
            className="w-9 h-9 rounded-lg border border-borde text-gris hover:text-dorado hover:border-dorado/50
                       transition-colors disabled:opacity-30 flex items-center justify-center text-sm"
          >→</button>
        </div>

        {/* Barra de progreso */}
        {isPlaying && currentFrame && (
          <div className="h-1 bg-borde/40 rounded-full overflow-hidden">
            <div
              className="h-full bg-dorado rounded-full transition-all"
              style={{ width: `${currentFrame.progress * 100}%` }}
            />
          </div>
        )}

        {/* Scene indicators */}
        {!isPlaying && (
          <div className="flex items-center justify-center gap-1.5">
            {scenes.map((s, i) => (
              <button
                key={s.id}
                onClick={() => setSceneIndex(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === sceneIndex ? 'bg-dorado' : 'bg-borde hover:bg-borde/80'
                }`}
                title={s.name}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-borde/30 flex items-center justify-between text-[10px] text-gris/40">
        <span>Visualización de solo lectura</span>
        <span>FORMACIONES by Póleo Lab</span>
      </footer>
    </div>
  )
}
