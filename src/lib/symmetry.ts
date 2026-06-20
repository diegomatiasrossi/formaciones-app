// Mirror symmetry (left ↔ right) calculation for the Reports page.
//
// COORDINATE SYSTEM
// Dancer positions are stored in canvas pixel coordinates.
// The editor's default canvas is 800×560px with 40px padding on each side,
// giving a 720×480px stage area. However, the actual canvas width is dynamic
// (it matches the container width at runtime via setStageSize).
//
// KEY INSIGHT — viewport-independence of relative positions:
//   For any canvas width W and padding P=40:
//     relative_x = (dancer.x - P) / (W - 2P)
//   A dancer placed at the stage centre always has relative_x = 0.5,
//   regardless of the canvas width when the position was saved.
//   This means px→m conversion using the canonical 800px width is exact
//   for formation-placed dancers on any screen size.
//
// TWO CALCULATION PATHS
//   Custom stages (stageWidth & stageHeight in metres provided):
//     → convert to real metres, tolerance = 0.5m  (exact)
//   Non-custom stages (no real dimensions):
//     → work in canvas pixels, tolerance = 36px    (≈0.5m on a 10m reference stage)

const PADDING = 40
const CANVAS_W = 800   // canonical editor canvas width (px)
const CANVAS_H = 560   // canonical editor canvas height (px)
const STAGE_W_PX = CANVAS_W - 2 * PADDING  // 720
const STAGE_H_PX = CANVAS_H - 2 * PADDING  // 480

const TOLERANCE_M  = 0.5                          // metres
const REF_STAGE_M  = 10                           // reference stage width for non-custom (m)
const TOLERANCE_PX = Math.round(TOLERANCE_M * STAGE_W_PX / REF_STAGE_M) // 36 px

interface Pos { x: number; y: number }

// ── Pixel path (non-custom stages) ────────────────────────────────────────────

function calcScenePx(dancers: Pos[]): number {
  const centre = CANVAS_W / 2
  const used   = new Set<number>()
  let symmetric = 0

  dancers.forEach((d, i) => {
    if (used.has(i)) return
    const mirroredX = CANVAS_W - d.x

    if (Math.abs(d.x - centre) <= TOLERANCE_PX) {
      symmetric += 1; used.add(i); return
    }

    const pairIdx = dancers.findIndex((o, j) =>
      j !== i && !used.has(j) &&
      Math.abs(o.x - mirroredX) <= TOLERANCE_PX &&
      Math.abs(o.y  - d.y)      <= TOLERANCE_PX,
    )
    if (pairIdx !== -1) {
      symmetric += 2; used.add(i); used.add(pairIdx)
    }
  })

  return Math.round((symmetric / dancers.length) * 100)
}

// ── Metre path (custom stages with real dimensions) ────────────────────────────

function pxToM(px: number, stagePx: number, stageM: number): number {
  return ((px - PADDING) / stagePx) * stageM
}

function calcSceneM(dancers: Pos[], widthM: number, heightM: number): number {
  const centreM = widthM / 2
  const tol     = TOLERANCE_M

  // Convert all positions to real metres once
  const pts = dancers.map(d => ({
    x: pxToM(d.x, STAGE_W_PX, widthM),
    y: pxToM(d.y, STAGE_H_PX, heightM),
  }))

  const used = new Set<number>()
  let symmetric = 0

  pts.forEach((d, i) => {
    if (used.has(i)) return
    const mirroredX = widthM - d.x

    if (Math.abs(d.x - centreM) <= tol) {
      symmetric += 1; used.add(i); return
    }

    const pairIdx = pts.findIndex((o, j) =>
      j !== i && !used.has(j) &&
      Math.abs(o.x - mirroredX) <= tol &&
      Math.abs(o.y  - d.y)      <= tol,
    )
    if (pairIdx !== -1) {
      symmetric += 2; used.add(i); used.add(pairIdx)
    }
  })

  return Math.round((symmetric / dancers.length) * 100)
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function calcSceneSymmetry(
  dancers: Pos[],
  widthM?: number | null,
  heightM?: number | null,
): number {
  if (dancers.length === 0) return 0
  return (widthM && heightM)
    ? calcSceneM(dancers, widthM, heightM)
    : calcScenePx(dancers)
}

export function calcProjectSymmetry(
  scenes: { dancers: Pos[] }[],
  widthM?: number | null,
  heightM?: number | null,
): { overall: number; perScene: number[] } {
  if (scenes.length === 0) return { overall: 0, perScene: [] }
  const perScene = scenes.map(s => calcSceneSymmetry(s.dancers, widthM, heightM))
  const overall  = Math.round(perScene.reduce((sum, v) => sum + v, 0) / perScene.length)
  return { overall, perScene }
}
