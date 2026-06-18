import { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Circle } from 'react-konva'
import { generateFormation } from '@/lib/formations'
import type { FormationId } from '@/types'

const DEMO_FORMATIONS: FormationId[] = ['circle', 'inverted-v', 'triangle', 'wave', 'diamond']
const TRANSITION_MS = 1500
const HOLD_MS = 1000

interface DemoPoint { x: number; y: number; opacity: number }

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }
function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2 }

interface Props {
  width?: number
  height?: number
  dancerCount?: number
  color?: string
}

export function FormationDemo({ width = 400, height = 260, dancerCount = 12, color = '#C9A961' }: Props) {
  const cx = width / 2
  const cy = height / 2
  const spacing = Math.min(width, height) / 7

  const [points, setPoints] = useState<DemoPoint[]>(() => {
    const pts = generateFormation(DEMO_FORMATIONS[0], dancerCount, cx, cy, spacing)
    return pts.map(p => ({ ...p, opacity: 1 }))
  })

  const phaseRef = useRef<'hold' | 'transition'>('hold')
  const fromIndexRef = useRef(0)
  const rafRef = useRef(0)
  const startRef = useRef(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    function tick(now: number) {
      if (pausedRef.current) {
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      const elapsed = now - startRef.current

      if (phaseRef.current === 'hold') {
        if (elapsed >= HOLD_MS) {
          phaseRef.current = 'transition'
          startRef.current = now
        }
        rafRef.current = requestAnimationFrame(tick)
        return
      }

      // transition phase
      const t = Math.min(elapsed / TRANSITION_MS, 1)
      const eased = ease(t)
      const fromIdx = fromIndexRef.current
      const toIdx = (fromIdx + 1) % DEMO_FORMATIONS.length
      const from = generateFormation(DEMO_FORMATIONS[fromIdx], dancerCount, cx, cy, spacing)
      const to   = generateFormation(DEMO_FORMATIONS[toIdx],   dancerCount, cx, cy, spacing)
      const maxLen = Math.max(from.length, to.length)
      const next: DemoPoint[] = []
      for (let i = 0; i < maxLen; i++) {
        const a = from[i]
        const b = to[i]
        if (a && b) next.push({ x: lerp(a.x, b.x, eased), y: lerp(a.y, b.y, eased), opacity: 1 })
        else if (a) next.push({ ...a, opacity: lerp(1, 0, eased) })
        else if (b) next.push({ ...b, opacity: lerp(0, 1, eased) })
      }
      setPoints(next)

      if (t >= 1) {
        fromIndexRef.current = toIdx
        phaseRef.current = 'hold'
        startRef.current = now
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    startRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)

    function handleVisibility() {
      pausedRef.current = document.hidden
      if (!document.hidden) startRef.current = performance.now()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelAnimationFrame(rafRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [dancerCount, cx, cy, spacing])

  // Reset when dancerCount or color changes
  useEffect(() => {
    const pts = generateFormation(DEMO_FORMATIONS[fromIndexRef.current], dancerCount, cx, cy, spacing)
    setPoints(pts.map(p => ({ ...p, opacity: 1 })))
  }, [dancerCount, cx, cy, spacing])

  return (
    <Stage width={width} height={height} listening={false}>
      <Layer>
        {points.map((p, i) => (
          <Circle
            key={i}
            x={p.x}
            y={p.y}
            radius={6}
            fill={color}
            opacity={p.opacity * 0.9}
            shadowColor={color}
            shadowBlur={8}
            shadowOpacity={0.5}
          />
        ))}
      </Layer>
    </Stage>
  )
}
