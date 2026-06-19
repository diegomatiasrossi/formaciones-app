import { create } from 'zustand'
import type { Project, StageRatio, Member, ChecklistItem } from '@/types'
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
  startDate?: string
  endDate?: string
}

type ProjectMeta = Partial<Pick<Project, 'checklist' | 'members' | 'notes' | 'startDate' | 'endDate'>>

interface ProjectActions {
  fetchProjects: () => Promise<void>
  saveProject: (project: Project) => Promise<void>
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

async function projectToRow(project: Project) {
  const { data: { user } } = await supabase.auth.getUser()
  return {
    id: project.id,
    name: project.name,
    group_name: project.groupName ?? null,
    choreography_name: project.choreographyName ?? null,
    stage_ratio: project.stageRatio ?? '16:9',
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
        .from('projects')
        .select('*')
        .eq('owner_id', user.id)
        .order('updated_at', { ascending: false })
      if (error) throw error
      const projects: Project[] = (data ?? []).map(parseProject)
      set({ projects, loading: false })
    } catch (err) {
      set({ error: String(err), loading: false })
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
    } catch (err) {
      set({ error: String(err), loading: false })
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
      stageRatio: opts.stageRatio ?? '16:9',
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
