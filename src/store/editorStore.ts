import { create } from 'zustand'
import type {
  Dancer, DancerLevel, DancerShape, EdgeSide, EditorTool, FormationId, Scene, SceneMarker,
} from '@/types'
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
  audioMarkers: SceneMarker[]
  _past: string[]
  _future: string[]
}

interface EditorActions {
  setActiveScene: (id: string) => void
  addScene: () => void
  removeScene: (id: string) => void
  renameScene: (id: string, name: string) => void
  duplicateScene: (id: string) => void
  addDancerAt: (x: number, y: number) => void
  moveDancer: (id: string, x: number, y: number) => void
  moveDancers: (deltas: { id: string; x: number; y: number }[]) => void
  deleteSelected: () => void
  clearAll: () => void
  setLevel: (id: string, level: DancerLevel) => void
  setColor: (ids: string[], color: string) => void
  setShape: (ids: string[], shape: DancerShape) => void
  setSize: (ids: string[], size: number) => void
  renameDancer: (id: string, name: string) => void
  select: (id: string, multi: boolean) => void
  selectAll: () => void
  clearSelection: () => void
  setSelectedIds: (ids: string[]) => void
  applyFormation: (id: FormationId) => void
  rotateAll: (deg: number) => void
  mirrorH: () => void
  mirrorV: () => void
  scaleFormation: (factor: number) => void
  setFormationName: (sceneId: string, name: string) => void
  setSceneMarker: (sceneId: string, timestampMs: number) => void
  setMultiLevel: (ids: string[], level: DancerLevel) => void
  setDancerPresence: (id: string, active: boolean, entryEdge?: EdgeSide, exitEdge?: EdgeSide) => void
  updateSceneTransition: (id: string, patch: Partial<Pick<Scene, 'transitionMode' | 'canonOrder' | 'canonDelayMs' | 'canonCustomOrder'>>) => void
  setTool: (tool: EditorTool) => void
  setShowGrid: (v: boolean) => void
  setShowLabels: (v: boolean) => void
  setShowZones: (v: boolean) => void
  setSnapEnabled: (v: boolean) => void
  setStageSize: (w: number, h: number) => void
  setNewColor: (c: string) => void
  setNewShape: (s: DancerShape) => void
  setNewSize: (s: number) => void
  setNewDancerCount: (n: number) => void
  loadScenes: (scenes: Scene[], activeId: string, audioMarkers?: SceneMarker[]) => void
  undo: () => void
  redo: () => void
}

// ── Helpers ────────────────────────────────────────────────────────

function makeDancer(
  x: number, y: number, index: number,
  color: string, shape: DancerShape, size: number,
): Dancer {
  return { id: nanoid(), name: `B${index}`, x, y, color, shape, size, level: 'standing' }
}

function makeScene(name: string): Scene {
  return { id: nanoid(), name, dancers: [] }
}

function updateActive(
  scenes: Scene[], activeId: string,
  fn: (s: Scene) => Scene,
): Scene[] {
  return scenes.map(s => s.id === activeId ? fn(s) : s)
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
  newDancerCount: 12,
  stageWidth: 800,
  stageHeight: 560,
  audioMarkers: [],
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

  // ── Bailarines ───────────────────────────────────────────────────

  addDancerAt: (rawX, rawY) => {
    const { newColor, newShape, newSize, snapEnabled, gridSize, scenes, activeSceneId } = get()
    const scene = scenes.find(s => s.id === activeSceneId)
    if (scene && scene.dancers.length >= 50) return
    const x = snapEnabled ? snapToGrid(rawX, gridSize) : Math.round(rawX)
    const y = snapEnabled ? snapToGrid(rawY, gridSize) : Math.round(rawY)
    const d = makeDancer(x, y, (scene?.dancers.length ?? 0) + 1, newColor, newShape, newSize)
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

  applyFormation: id => {
    const { newDancerCount, newColor, newShape, newSize, stageWidth, stageHeight } = get()
    const cx = stageWidth / 2
    const cy = stageHeight / 2
    const pts = generateFormation(id, newDancerCount, cx, cy, 40)
    const dancers: Dancer[] = pts.map((p, i) =>
      makeDancer(p.x, p.y, i + 1, newColor, newShape, newSize),
    )
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({ ...sc, dancers })),
      })),
      selectedIds: [],
    }))
  },

  // ── Transformaciones ─────────────────────────────────────────────

  rotateAll: deg => {
    const { stageWidth, stageHeight } = get()
    const cx = stageWidth / 2
    const cy = stageHeight / 2
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc,
          dancers: sc.dancers.map(d => {
            const { x, y } = rotatePoint(d.x, d.y, cx, cy, deg)
            return { ...d, x, y }
          }),
        })),
      })),
    }))
  },

  mirrorH: () => {
    const cx = get().stageWidth / 2
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc,
          dancers: sc.dancers.map(d => ({ ...d, x: mirrorPointH(d.x, cx) })),
        })),
      })),
    }))
  },

  mirrorV: () => {
    const cy = get().stageHeight / 2
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc,
          dancers: sc.dancers.map(d => ({ ...d, y: mirrorPointV(d.y, cy) })),
        })),
      })),
    }))
  },

  scaleFormation: factor => {
    const cx = get().stageWidth / 2
    const cy = get().stageHeight / 2
    set(s => ({
      ...withHistory(s, () => ({
        scenes: updateActive(s.scenes, s.activeSceneId, sc => ({
          ...sc,
          dancers: sc.dancers.map(d => ({
            ...d,
            x: Math.round(cx + (d.x - cx) * factor),
            y: Math.round(cy + (d.y - cy) * factor),
          })),
        })),
      })),
    }))
  },

  // ── Undo / Redo ───────────────────────────────────────────────────

  undo: () => {
    const { _past, _future } = get()
    if (_past.length === 0) return
    const prev = _past[_past.length - 1]
    const currentSnap = snapshot(get() as EditorState)
    const parsed: HistorySnapshot = JSON.parse(prev)
    set({
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
      scenes: s.scenes.map(sc => sc.id === sceneId ? { ...sc, formationName: name } : sc),
    })),

  setSceneMarker: (sceneId, timestampMs) =>
    set(s => {
      const existing = s.audioMarkers.filter(m => m.sceneId !== sceneId)
      return { audioMarkers: [...existing, { sceneId, timestampMs }] }
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

  updateSceneTransition: (id, patch) =>
    set(s => ({
      scenes: s.scenes.map(sc => sc.id === id ? { ...sc, ...patch } : sc),
    })),

  setTool: tool => set({ tool }),
  setShowGrid: v => set({ showGrid: v }),
  setShowLabels: v => set({ showLabels: v }),
  setShowZones: v => set({ showZones: v }),
  setSnapEnabled: v => set({ snapEnabled: v }),
  setStageSize: (w, h) => set({ stageWidth: w, stageHeight: h }),
  setNewColor: c => set({ newColor: c }),
  setNewShape: s => set({ newShape: s }),
  setNewSize: s => set({ newSize: s }),
  setNewDancerCount: n => set({ newDancerCount: Math.max(1, Math.min(50, n)) }),
  loadScenes: (scenes, activeId, audioMarkers) =>
    set({ scenes, activeSceneId: activeId, selectedIds: [], _past: [], _future: [], ...(audioMarkers ? { audioMarkers } : {}) }),
}))
