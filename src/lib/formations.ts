/**
 * Generadores de formaciones — funciones puras.
 * Cada función recibe (n, cx, cy, spacing) y devuelve Array<{x,y}>.
 * Testeables de forma aislada.
 */
import type { FormationCard, FormationId, FormationPoint } from '@/types'
import { centerPoints } from './geometry'

type FormationFn = (n: number, cx: number, cy: number, sp: number) => FormationPoint[]

// ── Generadores ────────────────────────────────────────────────────

export const formationGenerators: Record<FormationId, FormationFn> = {
  'line-h': (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => ({
      x: cx + (i - (n - 1) / 2) * sp,
      y: cy,
    })),

  'line-v': (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => ({
      x: cx,
      y: cy + (i - (n - 1) / 2) * sp,
    })),

  diagonal: (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => ({
      x: cx + (i - (n - 1) / 2) * sp * 0.7,
      y: cy + (i - (n - 1) / 2) * sp * 0.7,
    })),

  'v-shape': (n, cx, cy, sp) => {
    const pts: FormationPoint[] = []
    const half = Math.ceil(n / 2)
    for (let i = 0; i < half; i++)
      pts.push({ x: cx - (i + 1) * sp * 0.7, y: cy + (i + 1) * sp * 0.6 })
    for (let i = 0; i < n - half; i++)
      pts.push({ x: cx + (i + 1) * sp * 0.7, y: cy + (i + 1) * sp * 0.6 })
    return pts
  },

  'inverted-v': (n, cx, cy, sp) => {
    const pts: FormationPoint[] = []
    const half = Math.ceil(n / 2)
    for (let i = 0; i < half; i++)
      pts.push({ x: cx - i * sp * 0.7, y: cy - i * sp * 0.6 })
    for (let i = 0; i < n - half; i++)
      pts.push({ x: cx + (i + 1) * sp * 0.7, y: cy - (i + 1) * sp * 0.6 })
    return pts
  },

  circle: (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n - Math.PI / 2
      return { x: cx + Math.cos(a) * sp * 1.6, y: cy + Math.sin(a) * sp * 1.6 }
    }),

  semicircle: (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => {
      const a = (Math.PI * i) / Math.max(1, n - 1)
      return { x: cx + Math.cos(a) * sp * 1.9, y: cy - Math.sin(a) * sp * 1.5 }
    }),

  triangle: (n, cx, cy, sp) => {
    const rows = Math.ceil((-1 + Math.sqrt(1 + 8 * n)) / 2)
    const pts: FormationPoint[] = []
    for (let r = 0; r < rows && pts.length < n; r++) {
      for (let c = 0; c <= r && pts.length < n; c++) {
        pts.push({
          x: cx + (c - r / 2) * sp,
          y: cy - rows * sp * 0.5 + r * sp * 0.8,
        })
      }
    }
    return pts
  },

  diamond: (n, cx, cy, sp) => {
    const pts: FormationPoint[] = []
    const half = Math.ceil(n / 2)
    for (let i = 0; i < half; i++) {
      const t = i / half
      pts.push({ x: cx - Math.sin(t * Math.PI) * sp * 2, y: cy - sp * 2 + (i * sp * 4) / half })
    }
    for (let i = 0; i < n - half; i++) {
      const t = i / (n - half)
      pts.push({ x: cx + Math.sin(t * Math.PI) * sp * 2, y: cy - sp * 2 + (i * sp * 4) / (n - half) })
    }
    return pts
  },

  arrow: (n, cx, cy, sp) => {
    const head = Math.min(5, n)
    const pts: FormationPoint[] = []
    for (let i = 0; i < head; i++)
      pts.push({ x: cx + (i - 2) * sp * 0.72, y: cy - i * sp * 0.7 })
    for (let i = 0; i < n - head; i++)
      pts.push({ x: cx, y: cy + sp + i * sp * 0.9 })
    return pts
  },

  zigzag: (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => ({
      x: cx + (i - (n - 1) / 2) * sp * 0.9,
      y: cy + (i % 2 ? 1 : -1) * sp * 0.7,
    })),

  stagger: (n, cx, cy, sp) => {
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const pts: FormationPoint[] = []
    for (let r = 0; r < rows && pts.length < n; r++) {
      for (let c = 0; c < cols && pts.length < n; c++) {
        pts.push({
          x: cx + (c - (cols - 1) / 2) * sp + (r % 2) * sp * 0.5,
          y: cy + (r - (rows - 1) / 2) * sp * 0.9,
        })
      }
    }
    return pts
  },

  'x-shape': (n, cx, cy, sp) => {
    const half = Math.ceil(n / 4)
    const pts: FormationPoint[] = []
    for (let i = -half; i <= half && pts.length < n; i++) {
      if (i !== 0) {
        pts.push({ x: cx + i * sp * 0.8, y: cy + i * sp * 0.8 })
        if (pts.length < n) pts.push({ x: cx + i * sp * 0.8, y: cy - i * sp * 0.8 })
      }
    }
    if (pts.length < n) pts.push({ x: cx, y: cy })
    return pts
  },

  spiral: (n, cx, cy, _sp) =>
    Array.from({ length: n }, (_, i) => {
      const a = i * 0.8
      const r = 10 + i * 9
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
    }),

  wave: (n, cx, cy, sp) =>
    Array.from({ length: n }, (_, i) => ({
      x: cx + (i - (n - 1) / 2) * sp * 0.85,
      y: cy + Math.sin(i * 0.8) * sp * 1.2,
    })),

  blocks: (n, cx, cy, sp) => {
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)
    const pts: FormationPoint[] = []
    for (let r = 0; r < rows && pts.length < n; r++) {
      for (let c = 0; c < cols && pts.length < n; c++) {
        pts.push({
          x: cx + (c - (cols - 1) / 2) * sp,
          y: cy + (r - (rows - 1) / 2) * sp,
        })
      }
    }
    return pts
  },

  fractal: (n, cx, cy, sp) => {
    // Patrón recursivo simple: hexágono central + anillo
    const pts: FormationPoint[] = [{ x: cx, y: cy }]
    const rings = Math.ceil(n / 6)
    for (let ring = 1; ring <= rings && pts.length < n; ring++) {
      const count = ring * 6
      for (let i = 0; i < count && pts.length < n; i++) {
        const a = (2 * Math.PI * i) / count
        pts.push({ x: cx + Math.cos(a) * sp * ring, y: cy + Math.sin(a) * sp * ring })
      }
    }
    return pts.slice(0, n)
  },

  organic: (n, cx, cy, sp) =>
    // Distribución orgánica irregular con leve ruido
    Array.from({ length: n }, (_, i) => {
      const a = (2 * Math.PI * i) / n + (i % 3) * 0.3
      const r = sp * (1.2 + Math.sin(i * 1.7) * 0.4) * (0.8 + (i % 2) * 0.3)
      return { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
    }),

  cross: (n, cx, cy, sp) => {
    const perArm = Math.floor(n / 4)
    const pts: FormationPoint[] = []
    const dirs = [[1,0],[-1,0],[0,1],[0,-1]] as const
    for (const [dx, dy] of dirs) {
      for (let i = 1; i <= perArm && pts.length < n; i++) {
        pts.push({ x: cx + dx * i * sp, y: cy + dy * i * sp })
      }
    }
    if (pts.length < n) pts.push({ x: cx, y: cy })
    return pts
  },

  fan: (n, cx, cy, sp) => {
    const rows = Math.ceil(Math.sqrt(n * 0.5))
    const pts: FormationPoint[] = []
    for (let r = 0; r < rows && pts.length < n; r++) {
      const count = r * 2 + 1
      for (let c = 0; c < count && pts.length < n; c++) {
        pts.push({
          x: cx + (c - r) * sp * 0.9,
          y: cy - r * sp * 0.8,
        })
      }
    }
    return pts
  },
}

/** Genera los puntos de una formación centrados en (cx, cy). */
export function generateFormation(
  id: FormationId,
  n: number,
  cx: number,
  cy: number,
  spacing = 40,
): FormationPoint[] {
  const gen = formationGenerators[id]
  const raw = gen(Math.max(1, Math.min(50, n)), cx, cy, spacing)
  return centerPoints(raw.slice(0, n), cx, cy).map(p => ({
    x: Math.round(p.x),
    y: Math.round(p.y),
  }))
}

// ── Fichas pedagógicas ─────────────────────────────────────────────

export const FORMATION_CARDS: FormationCard[] = [
  {
    id: 'line-h',
    nameKey: 'formations.line_h',
    icon: '—',
    advantages: ['formations.cards.line_h.adv1', 'formations.cards.line_h.adv2'],
    risks: ['formations.cards.line_h.risk1'],
    feeling: 'formations.cards.line_h.feeling',
    bestUse: 'formations.cards.line_h.bestUse',
  },
  {
    id: 'line-v',
    nameKey: 'formations.line_v',
    icon: '|',
    advantages: ['formations.cards.line_v.adv1'],
    risks: ['formations.cards.line_v.risk1'],
    feeling: 'formations.cards.line_v.feeling',
    bestUse: 'formations.cards.line_v.bestUse',
  },
  {
    id: 'diagonal',
    nameKey: 'formations.diagonal',
    icon: '╱',
    advantages: ['formations.cards.diagonal.adv1', 'formations.cards.diagonal.adv2'],
    risks: ['formations.cards.diagonal.risk1'],
    feeling: 'formations.cards.diagonal.feeling',
    bestUse: 'formations.cards.diagonal.bestUse',
  },
  {
    id: 'v-shape',
    nameKey: 'formations.v_shape',
    icon: 'V',
    advantages: ['formations.cards.v_shape.adv1', 'formations.cards.v_shape.adv2'],
    risks: ['formations.cards.v_shape.risk1'],
    feeling: 'formations.cards.v_shape.feeling',
    bestUse: 'formations.cards.v_shape.bestUse',
  },
  {
    id: 'inverted-v',
    nameKey: 'formations.inverted_v',
    icon: '∧',
    advantages: ['formations.cards.inverted_v.adv1'],
    risks: ['formations.cards.inverted_v.risk1'],
    feeling: 'formations.cards.inverted_v.feeling',
    bestUse: 'formations.cards.inverted_v.bestUse',
  },
  {
    id: 'circle',
    nameKey: 'formations.circle',
    icon: '○',
    advantages: ['formations.cards.circle.adv1', 'formations.cards.circle.adv2'],
    risks: ['formations.cards.circle.risk1'],
    feeling: 'formations.cards.circle.feeling',
    bestUse: 'formations.cards.circle.bestUse',
  },
  {
    id: 'semicircle',
    nameKey: 'formations.semicircle',
    icon: '◡',
    advantages: ['formations.cards.semicircle.adv1'],
    risks: ['formations.cards.semicircle.risk1'],
    feeling: 'formations.cards.semicircle.feeling',
    bestUse: 'formations.cards.semicircle.bestUse',
  },
  {
    id: 'triangle',
    nameKey: 'formations.triangle',
    icon: '△',
    advantages: ['formations.cards.triangle.adv1', 'formations.cards.triangle.adv2'],
    risks: ['formations.cards.triangle.risk1'],
    feeling: 'formations.cards.triangle.feeling',
    bestUse: 'formations.cards.triangle.bestUse',
  },
  {
    id: 'diamond',
    nameKey: 'formations.diamond',
    icon: '◇',
    advantages: ['formations.cards.diamond.adv1'],
    risks: ['formations.cards.diamond.risk1'],
    feeling: 'formations.cards.diamond.feeling',
    bestUse: 'formations.cards.diamond.bestUse',
  },
  {
    id: 'arrow',
    nameKey: 'formations.arrow',
    icon: '↑',
    advantages: ['formations.cards.arrow.adv1', 'formations.cards.arrow.adv2'],
    risks: ['formations.cards.arrow.risk1'],
    feeling: 'formations.cards.arrow.feeling',
    bestUse: 'formations.cards.arrow.bestUse',
  },
  {
    id: 'zigzag',
    nameKey: 'formations.zigzag',
    icon: '∿',
    advantages: ['formations.cards.zigzag.adv1'],
    risks: ['formations.cards.zigzag.risk1'],
    feeling: 'formations.cards.zigzag.feeling',
    bestUse: 'formations.cards.zigzag.bestUse',
  },
  {
    id: 'stagger',
    nameKey: 'formations.stagger',
    icon: '⊞',
    advantages: ['formations.cards.stagger.adv1', 'formations.cards.stagger.adv2'],
    risks: ['formations.cards.stagger.risk1'],
    feeling: 'formations.cards.stagger.feeling',
    bestUse: 'formations.cards.stagger.bestUse',
  },
  {
    id: 'x-shape',
    nameKey: 'formations.x_shape',
    icon: '✕',
    advantages: ['formations.cards.x_shape.adv1'],
    risks: ['formations.cards.x_shape.risk1'],
    feeling: 'formations.cards.x_shape.feeling',
    bestUse: 'formations.cards.x_shape.bestUse',
  },
  {
    id: 'spiral',
    nameKey: 'formations.spiral',
    icon: '🌀',
    advantages: ['formations.cards.spiral.adv1', 'formations.cards.spiral.adv2'],
    risks: ['formations.cards.spiral.risk1'],
    feeling: 'formations.cards.spiral.feeling',
    bestUse: 'formations.cards.spiral.bestUse',
  },
  {
    id: 'wave',
    nameKey: 'formations.wave',
    icon: '〜',
    advantages: ['formations.cards.wave.adv1'],
    risks: ['formations.cards.wave.risk1'],
    feeling: 'formations.cards.wave.feeling',
    bestUse: 'formations.cards.wave.bestUse',
  },
  {
    id: 'blocks',
    nameKey: 'formations.blocks',
    icon: '▦',
    advantages: ['formations.cards.blocks.adv1', 'formations.cards.blocks.adv2'],
    risks: ['formations.cards.blocks.risk1'],
    feeling: 'formations.cards.blocks.feeling',
    bestUse: 'formations.cards.blocks.bestUse',
  },
  {
    id: 'fractal',
    nameKey: 'formations.fractal',
    icon: '❇',
    advantages: ['formations.cards.fractal.adv1'],
    risks: ['formations.cards.fractal.risk1'],
    feeling: 'formations.cards.fractal.feeling',
    bestUse: 'formations.cards.fractal.bestUse',
  },
  {
    id: 'organic',
    nameKey: 'formations.organic',
    icon: '~',
    advantages: ['formations.cards.organic.adv1'],
    risks: ['formations.cards.organic.risk1'],
    feeling: 'formations.cards.organic.feeling',
    bestUse: 'formations.cards.organic.bestUse',
  },
  {
    id: 'cross',
    nameKey: 'formations.cross',
    icon: '+',
    advantages: ['formations.cards.cross.adv1'],
    risks: ['formations.cards.cross.risk1'],
    feeling: 'formations.cards.cross.feeling',
    bestUse: 'formations.cards.cross.bestUse',
  },
  {
    id: 'fan',
    nameKey: 'formations.fan',
    icon: '⊿',
    advantages: ['formations.cards.fan.adv1', 'formations.cards.fan.adv2'],
    risks: ['formations.cards.fan.risk1'],
    feeling: 'formations.cards.fan.feeling',
    bestUse: 'formations.cards.fan.bestUse',
  },
]
