import { create } from 'zustand'
import type {
  Dancer, DancerLevel, DancerShape, DancerFacing, EdgeSide, EditorTool, FormationId, Scene, SceneMarker, Canon,
  TransitionType, CanonConfig,
} from '@/types'
import { DEFAULT_CANON_CONFIG } from '@/types'
import { generateFormation } from '@/lib/formations'
import { snapToGrid, rotatePoint, mirrorPointH, mirrorPointV } from '@/lib/geometry'
import { nanoid } from './nanoid'

// ── Tipos ──────────────────────────────────────────────────────────

interface EditorState {
  scenes: Scene[]
  activeSceneId: string
  selectedIds: string[]
  tool: EditorTool
  showGrid: boolean
  showLabels: boolean
  showZones: boolean
  gridSize: number
  snapEnabled: boolean
  newColor: string
  newShape: DancerShape
  newSize: number
  newDancerCount: number
  stageWidth: number
  stageHeight: number
  // Rectángulo real del escenario (respeta ratio/custom), en coords del canvas.
  // Lo publica StageCanvas; applyFormation lo usa para encajar la formación.
  stageRect: { x: number; y: number; w: number; h: number }
  audioMarkers: SceneMarker[]
  canons: Canon[]
  hasUnsavedChanges: boolean
  _past: string[]
  _future: string[]
}

interface EditorActions {
  setActiveScene: (id: string) => void
  addScene: () => void
  removeScene: (id: string) => void
  renameScene: (id: string, name: string) => void
  duplicateScene: (id: string) => void
  reorderScenes: (fromIndex: number, toIndex: number) => void
  addDancerAt: (x: number, y: number, memberName?: string) => void
  moveDancer: (id: string, x: number, y: number) => void
  moveDancers: (deltas: { id: string; x: number; y: number }[]) => void
  deleteSelected: () => void
  clearAll: () => void
  setLevel: (id: string, level: DancerLevel) => void
  setFacing: (id: string, facing: DancerFacing) => void
  setColor: (ids: string[], color: string) => void
  setShape: (ids: string[], shape: DancerShape) => void
  setSize: (ids: string[], size: number) => void
  renameDancer: (id: string, name: string) => void
  select: (id: string, multi: boolean) => void
  selectAll: () => void
  clearSelection: () => void
  setSelectedIds: (ids: string[]) => void
  applyFormation: (id: FormationId, memberNames?: string[], maxCount?: number) => void
  rotateAll: (deg: number) => void
  mirrorH: () => void
  mirrorV: () => void
  scaleFormation: (factor: number) => void
  setFormationName: (sceneId: string, name: string) => void
  setSceneMarker: (sceneId: string, timestampMs: number) => void
  setMultiLevel: (ids: string[], level: DancerLevel) => void
  setDancerPresence: (id: string, active: boolean, entryEdge?: EdgeSide, exitEdge?: EdgeSide) => void
  setTransitionType: (sceneId: string, type: TransitionType) => void
  setCanonConfig: (sceneId: string, patch: Partial<CanonConfig>) => void
  setTool: (tool: EditorTool) => void
  setShowGrid: (v: boolean) => void
  setShowLabels: (v: boolean) => void
  setShowZones: (v: boolean) => void
  setSnapEnabled: (v: boolean) => void
  setStageSize: (w: number, h: number) => void
  setStageRect: (rect: { x: number; y: number; w: number; h: number }) => void
  rescaleStage: (oldRect: { x: number; y: number; w: number; h: number }, newRect: { x: number; y: number; w: number; h: number }) => void
  setNewColor: (c: string) => void
  setNewShape: (s: DancerShape) => void
  setNewSize: (s: number) => void
  setNewDancerCount: (n: number) => void
  addCanon: (canon: Omit<Canon, 'id'>) => void
  removeCanon: (id: string) => void
  loadScenes: (scenes: Scene[], activeId: string, audioMarkers?: SceneMarker[], canons?: Canon[]) => void
  markSaved: () => void
  undo: () => void
  redo: () => void
}

// ── Helpers ────────────────────────────────────────────────────────

function makeDancer(
  x: number, y: number, index: number,
  color: string, shape: DancerShape, size: number,
  memberName?: string,
): Dancer {
  const name = memberName?.trim() || `B${index}`
  return { id: nanoid(), name, x, y, color, shape, size, level: 'standing' }
}

function makeScene(name: string): Scene {
  return { id: nanoid(), name, dancers: [] }
}

// Normaliza una escena al nuevo modelo de transición. Proyectos viejos pueden
// traer `transitionMode/canonOrder/canonDelayMs/canonCustomOrder`; los migramos a
// `transitionType/canonConfig`. Sin datos → 'simultaneous' (no rompe nada).
function migrateSceneTransition(s: Scene): Scene {
  if (s.transitionType) return s   // ya está en el modelo nuevo
  if (s.transitionMode === 'canon') {
    const legacyOrder = s.canonOrder
    const order: CanonConfig['order'] =
      legacyOrder === 'left-to-right' || legacyOrder === 'right-to-left'
        ? legacyOrder
        : legacyOrder === 'custom'
        ? 'manual'
        : 'left-to-right' // 'by-index' / 'center-out' → aproximación razonable
    return {
      ...s,
      transitionType: 'canon',
      canonConfig: {
        order,
        manualOrder: s.canonCustomOrder,
        offsetSeconds: (s.canonDelayMs ?? 150) / 1000,
        selection: 'all',
      },
    }
  }
  return { ...s, transitionType: 'simultaneous' }
}

function updateActive(
  scenes: Scene[], activeId: string,
  fn: (s: Scene) => Scene,
): Scene[] {
  return scenes.map(s => s.id === activeId ? fn(s) : s)
}

type StageRect = { x: number; y: number; w: number; h: number }

function isOutsideStage(d: Dancer, rect: StageRect): boolean {
  return d.x < rect.x || d.x > rect.x + rect.w || d.y < rect.y || d.y > rect.y + rect.h
}

// Reescala TODOS los dancers de una escena (bounding box → centrado + escalado
// a `rect`) para que la disposición relativa entre adentro del escenario
// actual, preservando el arreglo proporcional. Solo se aplica si hace falta
// (algún dancer activo fuera de los límites) — corrige datos ya guardados con
// la inconsistencia de "posiciones absolutas vs escenario reducido".
function fitSceneToStage(scene: Scene, rect: StageRect): Scene {
  const active = scene.dancers.filter(d => d.active !== false)
  if (active.length === 0 || !active.some(d => isOutsideStage(d, rect))) return scene

  const xs = scene.dancers.map(d => d.x), ys = scene.dancers.map(d => d.y)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  const bw = (maxX - minX) || 1, bh = (maxY - minY) || 1
  const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2

  const margin = 0.85
  const scale = Math.min((rect.w * margin) / bw, (rect.h * margin) / bh, 1)
  const ccx = rect.x + rect.w / 2
  const ccy = rect.y + rect.h / 2

  return {
    ...scene,
    dancers: scene.dancers.map(d => ({
      ...d,
      x: Math.round(ccx + (d.x - bcx) * scale),
      y: Math.round(ccy + (d.y - bcy) * scale),
    })),
  }
}

// Aplica una transformación a un subconjunto de dancers (los seleccionados si
// hay selección, sino todos) pivotando alrededor del centroide de ESE subconjunto.
function transformDancers(
  scene: Scene,
  selectedIds: string[],
  fn: (d: Dancer, cx: number, cy: number) => Dancer,
): Scene {
  const ids = selectedIds.length > 0 ? new Set(selectedIds) : null
  const targets = ids ? scene.dancers.filter(d => ids.has(d.id)) : scene.dancers
  if (targets.length === 0) return scene
  const cx = targets.reduce((a, d) => a + d.x, 0) / targets.length
  const cy = targets.reduce((a, d) => a + d.y, 0) / targets.length
  return {
    ...scene,
    dancers: scene.dancers.map(d => (!ids || ids.has(d.id)) ? fn(d, cx, cy) : d),
  }
}

type HistorySnapshot = { scenes: Scene[]; activeSceneId: string }

function snapshot(state: EditorState): string {
  return JSON.stringify({ scenes: state.scenes, activeSceneId: state.activeSceneId })
}

const MAX_HISTORY = 50

function withHistory(
  state: EditorState,
  updater: (s: EditorState) => Partial<EditorState>,
): Partial<EditorState> {
  const snap = snapshot(state)
  const next = updater(state)
  return {
    ...next,
    hasUnsavedChanges: true,
    _past: [...state._past.slice(-MAX_HISTORY + 1), snap],
    _future: [],
  }
}

// ── Estado inicial ─────────────────────────────────────────────────

const defaultScene = makeScene('Escena 1')

const INITIAL: EditorState = {
  scenes: [defaultScene],
  activeSceneId: defaultScene.id,
  selectedIds: [],
  tool: 'select',
  showGrid: true,
  showLabels: false,
  showZones: false,
  gridSize: 10,
  snapEnabled: true,
  newColor: '#C9A961',
  newShape: 'circle',
  newSize: 14,
  newDancerCount: 10,
  stageWidth: 800,
  stageHeight: 560,
  stageRect: { x: 40, y: 40, w: 720, h: 480 },
  audioMarkers: [],
  canons: [],
  hasUnsavedChanges: false,
  _past: [],
  _future: [],
}

// ── Store ──────────────────────────────────────────────────────────

export const useEditorStore = create<EditorState & EditorActions>()((set, get) => ({
  ...INITIAL,

  // ── Escenas ──────────────────────────────────────────────────────

  setActiveScene: id => set({ activeSceneId: id, selectedIds: [] }),

  addScene: () => {
    if (get().scenes.length >= 100) return
    const scene = makeScene(`Escena ${get().scenes.length + 1}`)
    set(s => ({
      ...withHistory(s, () => ({ scenes: [...s.scenes, scene], activeSceneId: scene.id })),
    }))
  },

  removeScene: id => {
    const { scenes, activeSceneId } = get()
    if (scenes.length <= 1) return
    const remaining = scenes.filter(s => s.id !== id)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: remaining,
        activeSceneId: activeSceneId === id ? remaining[0].id : activeSceneId,
      })),
    }))
  },

  renameScene: (id, name) =>
    set(s => ({
      hasUnsavedChanges: true,
      scenes: s.scenes.map(sc => sc.id === id ? { ...sc, name } : sc),
    })),

  duplicateScene: id => {
    const scene = get().scenes.find(s => s.id === id)
    if (!scene) return
    const copy: Scene = {
      ...scene,
      id: nanoid(),
      name: `${scene.name} (copia)`,
      dancers: scene.dancers.map(d => ({ ...d, id: nanoid() })),
    }
    set(s => ({
      ...withHistory(s, () => ({ scenes: [...s.scenes, copy], activeSceneId: copy.id })),
    }))
  },

  // Reordena escenas (drag & drop en el timeline). Usa withHistory para que
  // Ctrl+Z pueda deshacer el reorden, igual que removeScene/duplicateScene.
  reorderScenes: (fromIndex, toIndex) => {
    const { scenes } = get()
    if (
      fromIndex === toIndex ||
      fromIndex < 0 || toIndex < 0 ||
      fromIndex >= scenes.length || toIndex >= scenes.length
    ) return
    set(s => ({
      ...withHistory(s, () => {
        const next = [...s.scenes]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex, 0, moved)
        return { scenes: next }
      }),
    }))
  },

  // ── Bailarines ───────────────────────────────────────────────────

  addDancerAt: (rawX, rawY, memberName?) => {
    const { newColor, newShape, newSize, snapEnabled, gridSize, scenes, activeSceneId } = get()
    const scene = scenes.find(s => s.id === activeSceneId)
    if (scene && scene.dancers.length >= 50) return
    const x = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX)
    const y = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY)
    const index = (scene?.dancers.length ?? 0) + 1
    const d = makeDancer(x, y, index, newColor, newShape, newSize, memberName)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({ ...sc, dancers: [...sc.dancers, d] })),
      })),
    }))
  },

  moveDancer: (id, rawX, rawY) => {
    const { snapEnabled, gridSize } = get()
    const x = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX)
    const y = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY)
    set(s => ({
      hasUnsavedChanges: true,
      scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
        ...sc,
        dancers: sc.dancers.map(d => d.id === id ? { ...d, x, y } : d),
      })),
    }))
  },

  moveDancers: deltas => {
    const { snapEnabled, gridSize } = get()
    const map = new Map(deltas.map(d => [d.id, d]))
    set(s => ({
      hasUnsavedChanges: true,
      scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
        ...sc,
        dancers: sc.dancers.map(d => {
          const delta = map.get(d.id)
          if (!delta) return d
          return {
            ...d,
            x: snapEnabled ? snapToGrid(delta.x, gridSize) : Math.round(delta.x),
            y: snapEnabled ? snapToGrid(delta.y, gridSize) : Math.round(delta.y),
          }
        }),
      })),
    }))
  },

  deleteSelected: () => {
    const ids = new Set(get().selectedIds)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.filter(d => !ids.has(d.id)),
        })),
      })),
      selectedIds: [],
    }))
  },

  clearAll: () =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({ ...sc, dancers: [] })),
      })),
      selectedIds: [],
    })),

  setLevel: (id, level) =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => d.id === id ? { ...d, level } : d),
        })),
      })),
    })),

  setFacing: (id, facing) =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => d.id === id ? { ...d, facing } : d),
        })),
      })),
    })),

  setColor: (ids, color) => {
    const s_ = new Set(ids)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => s_.has(d.id) ? { ...d, color } : d),
        })),
      })),
    }))
  },

  setShape: (ids, shape) => {
    const s_ = new Set(ids)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => s_.has(d.id) ? { ...d, shape } : d),
        })),
      })),
    }))
  },

  setSize: (ids, size) => {
    const s_ = new Set(ids)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => s_.has(d.id) ? { ...d, size } : d),
        })),
      })),
    }))
  },

  renameDancer: (id, name) =>
    set(s => ({
      hasUnsavedChanges: true,
      scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
        ...sc, dancers: sc.dancers.map(d => d.id === id ? { ...d, name } : d),
      })),
    })),

  // ── Selección ────────────────────────────────────────────────────

  select: (id, multi) => {
    const { selectedIds } = get()
    if (multi) {
      set({
        selectedIds: selectedIds.includes(id)
          ? selectedIds.filter(s => s !== id)
          : [...selectedIds, id],
      })
    } else {
      set({ selectedIds: [id] })
    }
  },

  selectAll: () => {
    const scene = get().scenes.find(s => s.id === get().activeSceneId)
    set({ selectedIds: scene?.dancers.map(d => d.id) ?? [] })
  },

  clearSelection: () => set({ selectedIds: [] }),
  setSelectedIds: ids => set({ selectedIds: ids }),

  // ── Formaciones ──────────────────────────────────────────────────

  applyFormation: (id, memberNames?, maxCount?) => {
    const { newDancerCount, newColor, newShape, newSize, stageRect } = get()
    // Clamp the preset's dancer count to the plan limit so a Free user never
    // gets a formation that exceeds 10 (the backend trigger would reject the save).
    const count = Math.max(1, Math.min(newDancerCount, maxCount ?? Infinity))

    // Generar alrededor del origen y luego encajar dentro del rectángulo REAL del
    // escenario (respeta portrait/custom). Se centra en el escenario y se ESCALA
    // para que no exceda el área visible (solo achica, nunca agranda).
    const raw = generateFormation(id, count, 0, 0, 40)
    const xs = raw.map(p => p.x), ys = raw.map(p => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const bw = (maxX - minX) || 1, bh = (maxY - minY) || 1
    const bcx = (minX + maxX) / 2, bcy = (minY + maxY) / 2

    const margin = 0.85
    const scale = Math.min((stageRect.w * margin) / bw, (stageRect.h * margin) / bh, 1)
    const ccx = stageRect.x + stageRect.w / 2
    const ccy = stageRect.y + stageRect.h / 2

    const dancers: Dancer[] = raw.map((p, i) =>
      makeDancer(
        Math.round(ccx + (p.x - bcx) * scale),
        Math.round(ccy + (p.y - bcy) * scale),
        i + 1, newColor, newShape, newSize, memberNames?.[i],
      ),
    )
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({ ...sc, dancers })),
      })),
      selectedIds: [],
    }))
  },

  // ── Transformaciones ─────────────────────────────────────────────

  // Helper: transforma los dancers afectados (los seleccionados si hay
  // selección, sino todos) pivotando alrededor de SU PROPIO centroide, así la
  // formación rota/espeja/escala en su lugar en vez de saltar lejos del escenario.
  rotateAll: deg =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc =>
          transformDancers(sc, s.selectedIds, (d, cx, cy) => {
            const { x, y } = rotatePoint(d.x, d.y, cx, cy, deg)
            return { ...d, x, y }
          }),
        ),
      })),
    })),

  mirrorH: () =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc =>
          transformDancers(sc, s.selectedIds, (d, cx) => ({ ...d, x: mirrorPointH(d.x, cx) })),
        ),
      })),
    })),

  mirrorV: () =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc =>
          transformDancers(sc, s.selectedIds, (d, _cx, cy) => ({ ...d, y: mirrorPointV(d.y, cy) })),
        ),
      })),
    })),

  scaleFormation: factor =>
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc =>
          transformDancers(sc, s.selectedIds, (d, cx, cy) => ({
            ...d,
            x: Math.round(cx + (d.x - cx) * factor),
            y: Math.round(cy + (d.y - cy) * factor),
          })),
        ),
      })),
    })),

  // ── Undo / Redo ───────────────────────────────────────────────────

  undo: () => {
    const { _past, _future } = get()
    if (_past.length === 0) return
    const prev = _past[_past.length - 1]
    const currentSnap = snapshot(get() as EditorState)
    const parsed: HistorySnapshot = JSON.parse(prev)
    set({
      hasUnsavedChanges: true,
      scenes: parsed.scenes,
      activeSceneId: parsed.activeSceneId,
      selectedIds: [],
      _past: _past.slice(0, -1),
      _future: [currentSnap, ..._future].slice(0, MAX_HISTORY),
    })
  },

  redo: () => {
    const { _past, _future } = get()
    if (_future.length === 0) return
    const next = _future[0]
    const currentSnap = snapshot(get() as EditorState)
    const parsed: HistorySnapshot = JSON.parse(next)
    set({
      hasUnsavedChanges: true,
      scenes: parsed.scenes,
      activeSceneId: parsed.activeSceneId,
      selectedIds: [],
      _past: [..._past, currentSnap].slice(-MAX_HISTORY),
      _future: _future.slice(1),
    })
  },

  // ── Config ────────────────────────────────────────────────────────

  setFormationName: (sceneId, name) =>
    set(s => ({
      hasUnsavedChanges: true,
      scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, formationName: name } : sc),
    })),

  setSceneMarker: (sceneId, timestampMs) =>
    set(s => {
      const existing = s.audioMarkers.filter(m => m.sceneId !== sceneId)
      return { hasUnsavedChanges: true, audioMarkers: [...existing, { sceneId, timestampMs }] }
    }),

  setMultiLevel: (ids, level) => {
    const set_ = new Set(ids)
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => set_.has(d.id) ? { ...d, level } : d),
        })),
      })),
    }))
  },

  setDancerPresence: (id, active, entryEdge, exitEdge) => {
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc, dancers: sc.dancers.map(d => d.id === id
            ? { ...d, active, entryEdge: active ? entryEdge : d.entryEdge, exitEdge: active ? d.exitEdge : exitEdge }
            : d
          ),
        })),
      })),
    }))
  },

  setTransitionType: (sceneId, type) =>
    set(s => ({
      hasUnsavedChanges: true,
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? {
              ...sc,
              transitionType: type,
              // Al pasar a canon, garantizar que exista config con defaults.
              // Al volver a simultánea conservamos la config para no perderla.
              canonConfig: type === 'canon' ? (sc.canonConfig ?? { ...DEFAULT_CANON_CONFIG }) : sc.canonConfig,
            }
          : sc,
      ),
    })),

  setCanonConfig: (sceneId, patch) =>
    set(s => ({
      hasUnsavedChanges: true,
      scenes: s.scenes.map(sc =>
        sc.id === sceneId
          ? { ...sc, canonConfig: { ...(sc.canonConfig ?? DEFAULT_CANON_CONFIG), ...patch } }
          : sc,
      ),
    })),

  setTool: tool => set({ tool }),
  setShowGrid: v => set({ showGrid: v }),
  setShowLabels: v => set({ showLabels: v }),
  setShowZones: v => set({ showZones: v }),
  setSnapEnabled: v => set({ snapEnabled: v }),
  setStageSize: (w, h) => set({ stageWidth: w, stageHeight: h }),
  setStageRect: rect => set({ stageRect: rect }),

  // Cuando el área visible del escenario cambia de tamaño (ej: se abre el panel
  // de audio y el canvas se achica), reposiciona a TODOS los integrantes de
  // TODAS las escenas para que mantengan su posición proporcional al nuevo
  // tamaño en vez de la misma coordenada absoluta (que los dejaba fuera del
  // área visible). Se llama desde StageCanvas comparando el rect anterior vs
  // el nuevo cada vez que el contenedor se redimensiona.
  rescaleStage: (oldRect, newRect) => {
    if (oldRect.w <= 0 || oldRect.h <= 0) return
    const scaleX = newRect.w / oldRect.w
    const scaleY = newRect.h / oldRect.h
    set(s => ({
      hasUnsavedChanges: true,
      scenes: s.scenes.map(sc => ({
        ...sc,
        dancers: sc.dancers.map(d => ({
          ...d,
          x: Math.round(newRect.x + (d.x - oldRect.x) * scaleX),
          y: Math.round(newRect.y + (d.y - oldRect.y) * scaleY),
        })),
      })),
    }))
  },
  setNewColor: c => set({ newColor: c }),
  setNewShape: s => set({ newShape: s }),
  setNewSize: s => set({ newSize: s }),
  setNewDancerCount: n => set({ newDancerCount: Math.max(1, Math.min(50, n)) }),
  addCanon: canon =>
    set(s => ({ hasUnsavedChanges: true, canons: [...s.canons, { ...canon, id: nanoid() }] })),

  removeCanon: id =>
    set(s => ({ hasUnsavedChanges: true, canons: s.canons.filter(c => c.id !== id) })),

  loadScenes: (scenes, activeId, audioMarkers, canons) =>
    set(s => {
      const migrated = scenes.map(migrateSceneTransition)
      // Self-heal: si el proyecto trae dancers fuera del escenario actual
      // (guardados así por la inconsistencia de resize), los reencuadra al
      // cargar. Si no hace falta corregir nada, queda igual (sin marcar dirty).
      const fitted = migrated.map(sc => fitSceneToStage(sc, s.stageRect))
      const healed = fitted.some((sc, i) => sc !== migrated[i])
      return {
        scenes: fitted,
        activeSceneId: activeId, selectedIds: [], _past: [], _future: [],
        ...(audioMarkers ? { audioMarkers } : {}),
        canons: canons ?? [],
        hasUnsavedChanges: healed,
      }
    }),

  markSaved: () => set({ hasUnsavedChanges: false }),
}))
