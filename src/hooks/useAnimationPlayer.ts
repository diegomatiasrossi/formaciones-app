import { useCallback, useRef, useState } from 'react'
import type { Scene } from '@/types'

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

function computeCanonOrder(
  fromScene: Scene,
  toScene: Scene,
  order: NonNullable<Scene['canonOrder']>,
  customOrder: string[] | undefined,
  sw: number,
  sh: number,
): string[] {
  const fromActive = fromScene.dancers.filter(d => d.active !== false)
  const toActive   = toScene.dancers.filter(d => d.active !== false)
  const allIds = Array.from(new Set([...fromActive.map(d => d.id), ...toActive.map(d => d.id)]))

  const posMap = new Map<string, { x: number; y: number }>()
  for (const d of fromActive) posMap.set(d.id, { x: d.x, y: d.y })
  for (const d of toActive)   if (!posMap.has(d.id)) posMap.set(d.id, { x: d.x, y: d.y })

  switch (order) {
    case 'by-index': return allIds
    case 'left-to-right':
      return [...allIds].sort((a, b) => (posMap.get(a)?.x ?? 0) - (posMap.get(b)?.x ?? 0))
    case 'right-to-left':
      return [...allIds].sort((a, b) => (posMap.get(b)?.x ?? 0) - (posMap.get(a)?.x ?? 0))
    case 'center-out': {
      const cx = sw / 2; const cy = sh / 2
      return [...allIds].sort((a, b) => {
        const pa = posMap.get(a) ?? { x: cx, y: cy }
        const pb = posMap.get(b) ?? { x: cx, y: cy }
        return Math.hypot(pa.x - cx, pa.y - cy) - Math.hypot(pb.x - cx, pb.y - cy)
      })
    }
    case 'custom': return customOrder ?? allIds
    default:        return allIds
  }
}

function interpolateScenesCanon(
  from: Scene,
  to: Scene,
  segmentElapsed: number,
  sw: number,
  sh: number,
  canonOrder: string[],
  canonDelayMs: number,
  baseTransitionMs: number,
): AnimFrame['dancers'] {
  const fromActive = from.dancers.filter(d => d.active !== false)
  const toActive   = to.dancers.filter(d => d.active !== false)
  const maxLen = Math.max(fromActive.length, toActive.length)
  const result: AnimFrame['dancers'] = []

  for (let i = 0; i < maxLen; i++) {
    const a = fromActive[i]
    const b = toActive[i]
    const dancerId = a?.id ?? b?.id ?? ''
    const canonIndex = canonOrder.indexOf(dancerId)
    const delay = (canonIndex >= 0 ? canonIndex : i) * canonDelayMs
    const localT = Math.min(1, Math.max(0, (segmentElapsed - delay) / baseTransitionMs))
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

    // Compute per-segment durations (variable for canon)
    const segmentDurations = scenes.slice(0, -1).map((_, i) => {
      const toScene = scenes[i + 1]
      if (toScene.transitionMode === 'canon') {
        const n = toScene.dancers.filter(d => d.active !== false).length
        const delay = toScene.canonDelayMs ?? 150
        return transitionMs + Math.max(0, n - 1) * delay
      }
      return transitionMs
    })
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

      let dancers: AnimFrame['dancers']
      if (toScene.transitionMode === 'canon') {
        const canonOrder = computeCanonOrder(
          fromScene, toScene,
          toScene.canonOrder ?? 'by-index',
          toScene.canonCustomOrder,
          sw, sh,
        )
        dancers = interpolateScenesCanon(
          fromScene, toScene, segmentElapsed, sw, sh,
          canonOrder, toScene.canonDelayMs ?? 150, transitionMs,
        )
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
