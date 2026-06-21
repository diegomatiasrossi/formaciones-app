import { create } from 'zustand'
import type { Project, StageRatio, Member, ChecklistItem, Dancer, Scene } from '@/types'
import { supabase } from '@/features/auth/supabaseClient'
import { nanoid } from './nanoid'
import { DEFAULT_CHECKLIST } from '@/data/checklist'

interface ProjectState {
  projects: Project[]
  loading: boolean
  error: string | null
}

interface CreateProjectOpts {
  name: string
  groupName?: string
  choreographyName?: string
  stageRatio?: StageRatio
  stageWidth?: number | null
  stageHeight?: number | null
  startDate?: string
  endDate?: string
}

type ProjectMeta = Partial<Pick<Project, 'checklist' | 'members' | 'notes' | 'startDate' | 'endDate'>>

interface ProjectActions {
  fetchProjects: () => Promise<void>
  fetchProjectById: (id: string) => Promise<Project | null>
  saveProject: (project: Project) => Promise<{ error: string | null }>
  updateProjectMeta: (id: string, meta: ProjectMeta) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  createLocalProject: (opts: CreateProjectOpts | string) => Project
  generateShareToken: (projectId: string) => Promise<string>
  revokeShareToken: (projectId: string) => Promise<void>
  setShareShowNames: (projectId: string, show: boolean) => Promise<void>
}

function parseProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    groupName: (row.group_name as string | null) ?? undefined,
    choreographyName: (row.choreography_name as string | null) ?? undefined,
    stageRatio: ((row.stage_ratio as StageRatio) ?? '16:9') as StageRatio,
    stageWidth:  (row.stage_width  as number | null) ?? null,
    stageHeight: (row.stage_height as number | null) ?? null,
    groupId: (row.group_id as string | null) ?? null,
    eventId: (row.event_id as string | null) ?? null,
    scenes: (row.data as Record<string, unknown>)?.scenes as Project['scenes'] ?? [],
    activeSceneId: (row.data as Record<string, unknown>)?.activeSceneId as string ?? '',
    audioMarkers: (row.data as Record<string, unknown>)?.audioMarkers as Project['audioMarkers'] ?? [],
    startDate: (row.data as Record<string, unknown>)?.startDate as string | undefined,
    endDate: (row.data as Record<string, unknown>)?.endDate as string | undefined,
    notes: (row.data as Record<string, unknown>)?.notes as string | undefined,
    members: (row.data as Record<string, unknown>)?.members as Member[] | undefined,
    checklist: (row.data as Record<string, unknown>)?.checklist as ChecklistItem[] | undefined,
    shareToken: (row.share_token as string | null) ?? undefined,
    shareShowNames: (row.share_show_names as boolean | null) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
    ownerId: row.owner_id as string | undefined,
  }
}

// Parses a row from project_list_view into a lightweight Project for the list page.
// The returned object has _sceneCount/_dancerCount set and scenes contains only a
// synthetic first scene (for the thumbnail); full data is not loaded.
function parseProjectSummary(row: Record<string, unknown>): Project {
  const firstSceneDancers = (row.first_scene_dancers as Dancer[] | null) ?? []
  const firstSceneFormName = (row.first_scene_formation_name as string | null) ?? undefined
  const syntheticScenes: Scene[] = firstSceneDancers.length > 0 || firstSceneFormName
    ? [{ id: '_preview', name: 'Escena 1', formationName: firstSceneFormName, dancers: firstSceneDancers }]
    : []
  return {
    id: row.id as string,
    name: row.name as string,
    groupName: (row.group_name as string | null) ?? undefined,
    choreographyName: (row.choreography_name as string | null) ?? undefined,
    stageRatio: ((row.stage_ratio as StageRatio) ?? '16:9') as StageRatio,
    stageWidth:  (row.stage_width  as number | null) ?? null,
    stageHeight: (row.stage_height as number | null) ?? null,
    groupId:  (row.group_id  as string | null) ?? null,
    eventId:  (row.event_id  as string | null) ?? null,
    scenes: syntheticScenes,
    activeSceneId: (row.active_scene_id as string | null) ?? '',
    audioMarkers: [],
    shareToken:     (row.share_token      as string  | null) ?? undefined,
    shareShowNames: (row.share_show_names as boolean | null) ?? true,
    createdAt:  row.created_at  as string,
    updatedAt:  row.updated_at  as string,
    ownerId:    row.owner_id    as string | undefined,
    _sceneCount:  (row.scene_count  as number) ?? 0,
    _dancerCount: (row.dancer_count as number) ?? 0,
  }
}

async function projectToRow(project: Project) {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    id: project.id,
    name: project.name,
    group_name: project.groupName ?? null,
    choreography_name: project.choreographyName ?? null,
    stage_ratio:  project.stageRatio ?? '16:9',
    // Solo incluir si tienen valor real — evita error si la columna aún no existe en Supabase
    ...(project.stageWidth  != null ? { stage_width:  project.stageWidth  } : {}),
    ...(project.stageHeight != null ? { stage_height: project.stageHeight } : {}),
    ...(project.groupId != null ? { group_id: project.groupId } : {}),
    ...(project.eventId != null ? { event_id: project.eventId } : {}),
    owner_id: project.ownerId ?? user?.id ?? null,
    data: {
      scenes: project.scenes,
      activeSceneId: project.activeSceneId,
      audioMarkers: project.audioMarkers ?? [],
      startDate: project.startDate,
      endDate: project.endDate,
      notes: project.notes,
      members: project.members,
      checklist: project.checklist,
    },
    updated_at: new Date().toISOString(),
  }
}

export const useProjectStore = create<ProjectState & ProjectActions>()(set => ({
  projects: [],
  loading: false,
  error: null,

  fetchProjects: async () => {
    set({ loading: true, error: null })
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { set({ projects: [], loading: false }); return }
      const { data, error } = await supabase
        .from('project_list_view')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      const projects: Project[] = (data ?? []).map(row => parseProjectSummary(row as Record<string, unknown>))
      set({ projects, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  fetchProjectById: async (id) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      if (!data) return null
      const project = parseProject(data as Record<string, unknown>)
      set(s => ({
        projects: s.projects.some(p => p.id === id)
          ? s.projects.map(p => p.id === id ? project : p)
          : [...s.projects, project],
      }))
      return project
    } catch (err) {
      console.error('Error loading project:', err)
      return null
    }
  },

  saveProject: async project => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.from('projects').upsert(await projectToRow(project))
      if (error) throw error
      set(s => ({
        projects: s.projects.some(p => p.id === project.id)
          ? s.projects.map(p => p.id === project.id ? project : p)
          : [...s.projects, project],
        loading: false,
      }))
      return { error: null }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      set({ error: message, loading: false })
      return { error: message }
    }
  },

  updateProjectMeta: async (id, meta) => {
    set(s => {
      const projects = s.projects.map(p =>
        p.id === id ? { ...p, ...meta, updatedAt: new Date().toISOString() } : p
      )
      const updated = projects.find(p => p.id === id)
      if (updated) {
        projectToRow(updated).then(row => supabase.from('projects').upsert(row)).then(({ error }) => {
          if (error) console.error('Error saving project meta:', error)
        })
      }
      return { projects }
    })
  },

  deleteProject: async id => {
    set({ loading: true, error: null })
    try {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
      set(s => ({ projects: s.projects.filter(p => p.id !== id), loading: false }))
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  createLocalProject: optsOrName => {
    const opts: CreateProjectOpts = typeof optsOrName === 'string'
      ? { name: optsOrName }
      : optsOrName
    const id = nanoid()
    const now = new Date().toISOString()
    const project: Project = {
      id,
      name: opts.name,
      groupName: opts.groupName,
      choreographyName: opts.choreographyName,
      stageRatio:  opts.stageRatio ?? '16:9',
      stageWidth:  opts.stageWidth  ?? null,
      stageHeight: opts.stageHeight ?? null,
      scenes: [{ id: nanoid(), name: 'Escena 1', dancers: [] }],
      activeSceneId: '',
      audioMarkers: [],
      startDate: opts.startDate,
      endDate: opts.endDate,
      members: [],
      checklist: DEFAULT_CHECKLIST.map(item => ({ ...item })),
      createdAt: now,
      updatedAt: now,
    }
    project.activeSceneId = project.scenes[0].id
    set(s => ({ projects: [project, ...s.projects] }))
    return project
  },

  generateShareToken: async projectId => {
    const token = nanoid() + nanoid() + nanoid()
    const { error } = await supabase.from('projects')
      .update({ share_token: token })
      .eq('id', projectId)
    if (error) throw error
    set(s => ({
      projects: s.projects.map(p =>
        p.id === projectId ? { ...p, shareToken: token } : p
      ),
    }))
    return token
  },

  revokeShareToken: async projectId => {
    const { error } = await supabase.from('projects')
      .update({ share_token: null })
      .eq('id', projectId)
    if (error) throw error
    set(s => ({
      projects: s.projects.map(p =>
        p.id === projectId ? { ...p, shareToken: undefined } : p
      ),
    }))
  },

  setShareShowNames: async (projectId, show) => {
    const { error } = await supabase.from('projects')
      .update({ share_show_names: show })
      .eq('id', projectId)
    if (error) throw error
    set(s => ({
      projects: s.projects.map(p =>
        p.id === projectId ? { ...p, shareShowNames: show } : p
      ),
    }))
  },
}))
