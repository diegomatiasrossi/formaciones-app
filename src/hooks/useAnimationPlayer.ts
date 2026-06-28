import { useCallback, useRef, useState } from 'react'
import type { Scene, CanonConfig } from '@/types'

export interface AnimFrame {
  dancers: { id: string; x: number; y: number; opacity: number }[]
  sceneName: string
  progress: number
}

interface PlayerState {
  isPlaying: boolean
  currentFrame: AnimFrame | null
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function ease(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function edgePoint(
  edge: string | undefined,
  sw: number, sh: number,
  tx: number, ty: number,
): { x: number; y: number } {
  switch (edge) {
    case 'top':    return { x: tx, y: -30 }
    case 'bottom': return { x: tx, y: sh + 30 }
    case 'left':   return { x: -30, y: ty }
    case 'right':  return { x: sw + 30, y: ty }
    default:       return { x: tx, y: sh + 30 }
  }
}

export function interpolateScenes(
  from: Scene,
  to: Scene,
  t: number,
  sw: number,
  sh: number,
): AnimFrame['dancers'] {
  const eased = ease(t)
  const result: AnimFrame['dancers'] = []
  const fromActive = from.dancers.filter(d => d.active !== false)
  const toActive   = to.dancers.filter(d => d.active !== false)
  const maxLen = Math.max(fromActive.length, toActive.length)

  for (let i = 0; i < maxLen; i++) {
    const a = fromActive[i]
    const b = toActive[i]
    if (a && b) {
      result.push({ id: a.id, x: lerp(a.x, b.x, eased), y: lerp(a.y, b.y, eased), opacity: 1 })
    } else if (a && !b) {
      const ep = edgePoint(a.exitEdge, sw, sh, a.x, a.y)
      result.push({ id: a.id, x: lerp(a.x, ep.x, eased), y: lerp(a.y, ep.y, eased), opacity: lerp(1, 0, eased) })
    } else if (!a && b) {
      const ep = edgePoint(b.entryEdge, sw, sh, b.x, b.y)
      result.push({ id: b.id, x: lerp(ep.x, b.x, eased), y: lerp(ep.y, b.y, eased), opacity: lerp(0, 1, eased) })
    }
  }
  return result
}

// ── Canon helpers ─────────────────────────────────────────────────────────────

// Calcula el delay (ms) de cada figura en una transición de canon, indexado por
// la MISMA posición que usa interpolateScenes (índice sobre dancers activos).
// La identidad/selección se toma de la escena destino `to` (donde vive la
// config); la posición para ordenar se toma de `from` (punto de partida).
function canonDelays(
  from: Scene,
  to: Scene,
  config: CanonConfig,
  offsetMs: number,
  baseTransitionMs: number,
): number[] {
  const fromActive = from.dancers.filter(d => d.active !== false)
  const toActive   = to.dancers.filter(d => d.active !== false)
  const n = Math.max(fromActive.length, toActive.length)

  const idAt = (i: number) => toActive[i]?.id ?? fromActive[i]?.id ?? String(i)
  const posAt = (i: number) => {
    const ref = fromActive[i] ?? toActive[i]
    return { x: ref?.x ?? 0, y: ref?.y ?? 0 }
  }

  const allIdx = Array.from({ length: n }, (_, i) => i)
  const participants = config.selection === 'all'
    ? allIdx
    : allIdx.filter(i => (config.selection as string[]).includes(idAt(i)))
  const participantSet = new Set(participants)

  let ordered: number[]
  switch (config.order) {
    case 'left-to-right': ordered = [...participants].sort((a, b) => posAt(a).x - posAt(b).x); break
    case 'right-to-left': ordered = [...participants].sort((a, b) => posAt(b).x - posAt(a).x); break
    // El público está abajo: Y alta = frente (downstage), Y baja = fondo (upstage).
    case 'back-to-front': ordered = [...participants].sort((a, b) => posAt(a).y - posAt(b).y); break
    case 'front-to-back': ordered = [...participants].sort((a, b) => posAt(b).y - posAt(a).y); break
    case 'manual': {
      const rank = new Map((config.manualOrder ?? []).map((id, idx) => [id, idx]))
      ordered = [...participants].sort(
        (a, b) => (rank.get(idAt(a)) ?? Infinity) - (rank.get(idAt(b)) ?? Infinity),
      )
      break
    }
    default: ordered = participants
  }

  const delays = new Array<number>(n).fill(0)
  ordered.forEach((idx, pos) => { delays[idx] = pos * offsetMs })

  // Los no-participantes permanecen quietos en su posición de la escena A mientras
  // el canon transcurre. Arrancan a moverse simultáneamente hacia B solo cuando el
  // último participante termina (delay = lastParticipantStart + baseTransitionMs).
  // La duración del segmento se extiende naturalmente: transitionMs + maxDelay,
  // donde maxDelay pasa a ser lastStart + baseTransitionMs.
  if (config.selection !== 'all' && participants.length < n) {
    const maxParticipantDelay = participants.length > 0
      ? Math.max(...participants.map(idx => delays[idx]))
      : 0
    const nonParticipantDelay = maxParticipantDelay + baseTransitionMs
    for (let i = 0; i < n; i++) {
      if (!participantSet.has(i)) delays[i] = nonParticipantDelay
    }
  }

  return delays
}

function interpolateCanon(
  from: Scene,
  to: Scene,
  segmentElapsed: number,
  sw: number,
  sh: number,
  delays: number[],
  baseTransitionMs: number,
): AnimFrame['dancers'] {
  const fromActive = from.dancers.filter(d => d.active !== false)
  const toActive   = to.dancers.filter(d => d.active !== false)
  const maxLen = Math.max(fromActive.length, toActive.length)
  const result: AnimFrame['dancers'] = []

  for (let i = 0; i < maxLen; i++) {
    const a = fromActive[i]
    const b = toActive[i]
    const localT = Math.min(1, Math.max(0, (segmentElapsed - (delays[i] ?? 0)) / baseTransitionMs))
    const eased = ease(localT)

    if (a && b) {
      result.push({ id: a.id, x: lerp(a.x, b.x, eased), y: lerp(a.y, b.y, eased), opacity: 1 })
    } else if (a && !b) {
      const ep = edgePoint(a.exitEdge, sw, sh, a.x, a.y)
      result.push({ id: a.id, x: lerp(a.x, ep.x, eased), y: lerp(a.y, ep.y, eased), opacity: lerp(1, 0, eased) })
    } else if (!a && b) {
      const ep = edgePoint(b.entryEdge, sw, sh, b.x, b.y)
      result.push({ id: b.id, x: lerp(ep.x, b.x, eased), y: lerp(ep.y, b.y, eased), opacity: lerp(0, 1, eased) })
    }
  }
  return result
}

// ── Hook principal ────────────────────────────────────────────────────────────

export function useAnimationPlayer(scenes: Scene[], transitionMs: number, sw = 720, sh = 480) {
  const [state, setState] = useState<PlayerState>({ isPlaying: false, currentFrame: null })
  const rafRef = useRef<number>(0)
  const startTimeRef = useRef<number>(0)

  const stop = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    setState({ isPlaying: false, currentFrame: null })
  }, [])

  const play = useCallback(() => {
    if (scenes.length < 2) return
    cancelAnimationFrame(rafRef.current)

    const totalSegments = scenes.length - 1

    // Identidad estable de figuras durante el preview.
    // El preview se reproduce SIEMPRE desde la primera escena y el canvas dibuja
    // las figuras de la escena activa (la primera). Como cada escena tiene ids de
    // dancer distintos (duplicar escena o aplicar formación generan ids nuevos) y
    // el emparejamiento entre escenas es POSICIONAL (por índice), re-etiquetamos
    // cada frame con el id de la 1ª escena según su índice. Sin esto, a partir del
    // 2º segmento los ids del frame no coinciden con los del canvas y las figuras
    // se "congelan" tras la primera transición (escena 1 → 2).
    const refIds = (scenes[0]?.dancers ?? [])
      .filter(d => d.active !== false)
      .map(d => d.id)
    const withStableIds = (arr: AnimFrame['dancers']): AnimFrame['dancers'] =>
      arr.map((d, i) => (refIds[i] ? { ...d, id: refIds[i] } : d))

    // Plan por segmento: duración + (si es canon) delays por figura, calculados
    // una sola vez al iniciar el preview.
    const segmentPlans = scenes.slice(0, -1).map((_, i) => {
      const fromScene = scenes[i]
      const toScene   = scenes[i + 1]
      if (toScene.transitionType === 'canon' && toScene.canonConfig) {
        const offsetMs = Math.max(0, toScene.canonConfig.offsetSeconds) * 1000
        const delays = canonDelays(fromScene, toScene, toScene.canonConfig, offsetMs, transitionMs)
        const maxDelay = delays.length ? Math.max(...delays) : 0
        return { canon: true as const, delays, duration: transitionMs + maxDelay }
      }
      return { canon: false as const, delays: [] as number[], duration: transitionMs }
    })
    const segmentDurations = segmentPlans.map(p => p.duration)
    const totalDuration = segmentDurations.reduce((a, b) => a + b, 0)

    setState({ isPlaying: true, currentFrame: null })
    startTimeRef.current = performance.now()

    function tick(now: number) {
      const elapsed = now - startTimeRef.current

      if (elapsed >= totalDuration) {
        const last = scenes[scenes.length - 1]
        setState({
          isPlaying: false,
          currentFrame: {
            dancers: withStableIds(
              last.dancers
                .filter(d => d.active !== false)
                .map(d => ({ id: d.id, x: d.x, y: d.y, opacity: 1 })),
            ),
            sceneName: last.name,
            progress: 1,
          },
        })
        return
      }

      // Find current segment by cumulative duration
      let cumulative = 0
      let segmentIndex = totalSegments - 1
      let segmentElapsed = elapsed
      for (let i = 0; i < totalSegments; i++) {
        if (elapsed < cumulative + segmentDurations[i]) {
          segmentIndex = i
          segmentElapsed = elapsed - cumulative
          break
        }
        cumulative += segmentDurations[i]
      }

      const fromScene = scenes[segmentIndex]
      const toScene   = scenes[segmentIndex + 1]
      const segDur    = segmentDurations[segmentIndex]
      const globalT   = elapsed / totalDuration

      const plan = segmentPlans[segmentIndex]
      let dancers: AnimFrame['dancers']
      if (plan.canon) {
        dancers = interpolateCanon(fromScene, toScene, segmentElapsed, sw, sh, plan.delays, transitionMs)
      } else {
        dancers = interpolateScenes(fromScene, toScene, segmentElapsed / segDur, sw, sh)
      }

      setState({
        isPlaying: true,
        currentFrame: {
          dancers: withStableIds(dancers),
          sceneName: (segmentElapsed / segDur) < 0.5 ? fromScene.name : toScene.name,
          progress: globalT,
        },
      })

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [scenes, transitionMs, sw, sh])

  return { ...state, play, stop }
}
