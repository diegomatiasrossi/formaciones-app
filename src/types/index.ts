export type DancerLevel = 'floor' | 'mid' | 'standing' | 'aerial'
export type DancerShape = 'circle' | 'triangle' | 'square'

export type EdgeSide = 'top' | 'bottom' | 'left' | 'right'

export interface Member {
  id: string
  name: string
  lastName: string
  styles: string
  music?: string
  notes?: string
}

export interface ChecklistItem {
  id: string
  label: string
  done: boolean
}

export interface Dancer {
  id: string
  name: string
  x: number
  y: number
  color: string
  shape: DancerShape
  size: number
  level: DancerLevel
  leader?: boolean
  active?: boolean
  entryEdge?: EdgeSide
  exitEdge?: EdgeSide
  memberId?: string | null   // vínculo real a la tabla members (null = integrante suelto)
}

// ── Módulos: Integrantes / Grupos / Eventos / Actividades ──────────────────

export type MemberType  = 'stage' | 'team'
export type MemberLevel = 'beginner' | 'intermediate' | 'advanced' | 'professional'

export interface CrewMember {
  id: string
  ownerId?: string
  firstName: string
  lastName?: string
  nickname?: string
  phone?: string
  email?: string
  type: MemberType
  level?: MemberLevel
  role?: string
  notes?: string
  groupIds?: string[]   // grupos a los que pertenece (cargado vía group_members)
  createdAt?: string
}

export interface CrewGroup {
  id: string
  ownerId?: string
  name: string
  createdAt?: string
}

export interface CrewEvent {
  id: string
  ownerId?: string
  name: string
  eventDate?: string
  location?: string
  groupId?: string | null
  createdAt?: string
}

export type ActivityContext = 'event' | 'group'

export interface Activity {
  id: string
  ownerId?: string
  title: string
  done: boolean
  contextType: ActivityContext
  contextId: string
  isPreset?: boolean
  createdAt?: string
}

export interface Scene {
  id: string
  name: string
  formationName?: string
  dancers: Dancer[]
  notes?: string
  transitionMode?: 'unison' | 'canon'
  canonOrder?: 'by-index' | 'left-to-right' | 'right-to-left' | 'center-out' | 'custom'
  canonDelayMs?: number
  canonCustomOrder?: string[]
}

export interface SceneMarker {
  sceneId: string
  timestampMs: number
}

export type StageRatio = '1:1' | '16:9' | '9:16' | 'custom'

export interface Project {
  id: string
  name: string
  groupName?: string
  choreographyName?: string
  stageRatio: StageRatio
  stageWidth?: number | null   // metros — solo para stageRatio='custom'
  stageHeight?: number | null  // metros — solo para stageRatio='custom'
  scenes: Scene[]
  activeSceneId: string
  audioMarkers: SceneMarker[]
  shareToken?: string
  shareShowNames?: boolean
  createdAt: string
  updatedAt: string
  ownerId?: string
  startDate?: string
  endDate?: string
  notes?: string
  members?: Member[]
  checklist?: ChecklistItem[]
  groupId?: string | null
  eventId?: string | null
  _sceneCount?: number   // set when loaded from lightweight list view; absent when fully loaded
  _dancerCount?: number  // set when loaded from lightweight list view; absent when fully loaded
}

export interface FormationPoint {
  x: number
  y: number
}

export type FormationId =
  | 'line-h' | 'line-v' | 'diagonal'
  | 'v-shape' | 'inverted-v'
  | 'circle' | 'semicircle'
  | 'triangle' | 'diamond' | 'arrow'
  | 'zigzag' | 'stagger' | 'x-shape'
  | 'spiral' | 'wave' | 'blocks'
  | 'fractal' | 'organic' | 'cross' | 'fan'

export interface FormationCard {
  id: FormationId
  nameKey: string
  icon: string
  advantages: string[]
  risks: string[]
  feeling: string
  bestUse: string
}

export interface LassoRect {
  x1: number; y1: number; x2: number; y2: number
}

export type StageZone =
  | 'upstage-left' | 'upstage-center' | 'upstage-right'
  | 'center-left'  | 'center-center'  | 'center-right'
  | 'downstage-left' | 'downstage-center' | 'downstage-right'

export type EditorTool = 'select' | 'add'

export const LEVEL_OPACITY: Record<DancerLevel, number> = {
  floor: 0.4, mid: 0.65, standing: 0.9, aerial: 1,
}

export const LEVEL_SCALE: Record<DancerLevel, number> = {
  floor: 0.7, mid: 0.85, standing: 1, aerial: 1.2,
}

export const LEVEL_META: Record<DancerLevel, { emoji: string; label: string; labelEn: string }> = {
  floor:    { emoji: '—', label: 'Suelo',   labelEn: 'Floor' },
  mid:      { emoji: '≈', label: 'Medio',   labelEn: 'Mid' },
  standing: { emoji: '|', label: 'De pie',  labelEn: 'Standing' },
  aerial:   { emoji: '↑', label: 'Aéreo',   labelEn: 'Aerial' },
}

// Tamaños canónicos S/M/L/XL → radio en px
export const SIZE_OPTIONS = [
  { label: 'S',  value: 10 },
  { label: 'M',  value: 14 },
  { label: 'L',  value: 18 },
  { label: 'XL', value: 22 },
] as const
