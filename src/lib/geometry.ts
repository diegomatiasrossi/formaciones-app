import type { FormationPoint } from '@/types'

export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize
}

export function rotatePoint(
  px: number, py: number,
  cx: number, cy: number,
  angleDeg: number,
): FormationPoint {
  const rad = (angleDeg * Math.PI) / 180
  const dx = px - cx
  const dy = py - cy
  return {
    x: Math.round(cx + dx * Math.cos(rad) - dy * Math.sin(rad)),
    y: Math.round(cy + dx * Math.sin(rad) + dy * Math.cos(rad)),
  }
}

export function mirrorPointH(px: number, cx: number): number {
  return Math.round(2 * cx - px)
}

export function mirrorPointV(py: number, cy: number): number {
  return Math.round(2 * cy - py)
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((bx - ax) ** 2 + (by - ay) ** 2)
}

/** Determina la zona del escenario (9 zonas) para un punto dado en el canvas. */
export function getStageZone(
  px: number, py: number,
  stageX: number, stageY: number,
  stageW: number, stageH: number,
): string {
  const relX = (px - stageX) / stageW
  const relY = (py - stageY) / stageH
  const col = relX < 1 / 3 ? 'left' : relX < 2 / 3 ? 'center' : 'right'
  // upstage = fondo (arriba en canvas), downstage = frente (abajo)
  const row = relY < 1 / 3 ? 'upstage' : relY < 2 / 3 ? 'center' : 'downstage'
  return `${row}-${col}`
}

/** Normaliza puntos de formación para centrarlos en (cx, cy). */
export function centerPoints(
  pts: FormationPoint[],
  cx: number,
  cy: number,
): FormationPoint[] {
  if (pts.length === 0) return pts
  const minX = Math.min(...pts.map(p => p.x))
  const maxX = Math.max(...pts.map(p => p.x))
  const minY = Math.min(...pts.map(p => p.y))
  const maxY = Math.max(...pts.map(p => p.y))
  const ox = (minX + maxX) / 2
  const oy = (minY + maxY) / 2
  return pts.map(p => ({ x: cx + (p.x - ox), y: cy + (p.y - oy) }))
}
