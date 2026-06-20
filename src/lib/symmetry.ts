// Mirror symmetry calculation for the reports page.
//
// Dancer positions are stored in canvas pixel coordinates where the default
// canvas is 800×560px with 40px padding on each side, giving a 720×480 stage
// area. The vertical mirror axis is the canvas horizontal center (x = 400).
//
// Tolerance: 0.5m mapped to pixels using a 10m reference stage width (72px/m),
// giving a default of 36px — roughly half a dancer's visual diameter.

const CANVAS_W = 800
const STAGE_AREA_W = 720   // CANVAS_W - 2 * 40 (PADDING)
const DEFAULT_STAGE_M = 10 // reference metres for non-custom stages
const TOLERANCE_M = 0.5

interface Pos { x: number; y: number }

function tolerancePx(stageWidthM: number): number {
  return Math.round(TOLERANCE_M * STAGE_AREA_W / stageWidthM)
}

export function calcSceneSymmetry(dancers: Pos[], tol: number): number {
  if (dancers.length === 0) return 0
  const centerX = CANVAS_W / 2
  const used = new Set<number>()
  let symmetric = 0

  dancers.forEach((d, i) => {
    if (used.has(i)) return
    const mirroredX = CANVAS_W - d.x

    // Dancer is on (or very near) the centre axis — its own mirror
    if (Math.abs(d.x - centerX) <= tol) {
      symmetric += 1
      used.add(i)
      return
    }

    // Look for a real mirrored partner
    const pairIdx = dancers.findIndex((other, j) =>
      j !== i &&
      !used.has(j) &&
      Math.abs(other.x - mirroredX) <= tol &&
      Math.abs(other.y - d.y) <= tol,
    )

    if (pairIdx !== -1) {
      symmetric += 2
      used.add(i)
      used.add(pairIdx)
    }
  })

  return Math.round((symmetric / dancers.length) * 100)
}

export function calcProjectSymmetry(
  scenes: { dancers: Pos[] }[],
  stageWidthM?: number | null,
): { overall: number; perScene: number[] } {
  if (scenes.length === 0) return { overall: 0, perScene: [] }
  const tol = tolerancePx(stageWidthM ?? DEFAULT_STAGE_M)
  const perScene = scenes.map(s => calcSceneSymmetry(s.dancers, tol))
  const overall = Math.round(perScene.reduce((sum, v) => sum + v, 0) / perScene.length)
  return { overall, perScene }
}
