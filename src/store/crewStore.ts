import { create } from 'zustand'
import { supabase } from '@/features/auth/supabaseClient'
import { useWorkspaceStore } from './workspaceStore'
import type {
  CrewMember, CrewGroup, CrewEvent, Activity,
  MemberType, MemberLevel, ActivityContext,
} from '@/types'

// ── Mappers Supabase row ↔ tipo ────────────────────────────────────────────

function rowToMember(r: Record<string, unknown>): CrewMember {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string | undefined,
    organizationId: (r.organization_id as string | null) ?? null,
    firstName: r.first_name as string,
    lastName: (r.last_name as string | null) ?? undefined,
    nickname: (r.nickname as string | null) ?? undefined,
    phone: (r.phone as string | null) ?? undefined,
    email: (r.email as string | null) ?? undefined,
    type: r.type as MemberType,
    level: (r.level as MemberLevel | null) ?? undefined,
    role: (r.role as string | null) ?? undefined,
    notes: (r.notes as string | null) ?? undefined,
    createdAt: r.created_at as string | undefined,
  }
}

function rowToGroup(r: Record<string, unknown>): CrewGroup {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string | undefined,
    organizationId: (r.organization_id as string | null) ?? null,
    name: r.name as string,
    createdAt: r.created_at as string | undefined,
  }
}

function rowToEvent(r: Record<string, unknown>): CrewEvent {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string | undefined,
    organizationId: (r.organization_id as string | null) ?? null,
    name: r.name as string,
    eventDate: (r.event_date as string | null) ?? undefined,
    location: (r.location as string | null) ?? undefined,
    groupId: (r.group_id as string | null) ?? null,
    createdAt: r.created_at as string | undefined,
  }
}

function rowToActivity(r: Record<string, unknown>): Activity {
  return {
    id: r.id as string,
    ownerId: r.owner_id as string | undefined,
    organizationId: (r.organization_id as string | null) ?? null,
    title: r.title as string,
    done: Boolean(r.done),
    contextType: r.context_type as ActivityContext,
    contextId: r.context_id as string,
    isPreset: Boolean(r.is_preset),
    createdAt: r.created_at as string | undefined,
  }
}

async function uid() {
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

// ── State ──────────────────────────────────────────────────────────────────

interface CrewState {
  members: CrewMember[]
  groups: CrewGroup[]
  events: CrewEvent[]
  activities: Activity[]
  groupMemberships: Record<string, string[]>  // groupId -> memberId[]
  loading: boolean
  error: string | null
}

interface CrewActions {
  fetchAll: () => Promise<void>
  // members
  createMember: (m: Omit<CrewMember, 'id'>) => Promise<void>
  updateMember: (id: string, patch: Partial<CrewMember>) => Promise<void>
  deleteMember: (id: string) => Promise<void>
  // groups
  createGroup: (name: string) => Promise<CrewGroup | null>
  updateGroup: (id: string, name: string) => Promise<void>
  deleteGroup: (id: string) => Promise<void>
  setMemberGroups: (memberId: string, groupIds: string[]) => Promise<void>
  membersOfGroup: (groupId: string) => CrewMember[]
  groupsOfMember: (memberId: string) => CrewGroup[]
  // events
  createEvent: (e: Omit<CrewEvent, 'id'>) => Promise<CrewEvent | null>
  updateEvent: (id: string, patch: Partial<CrewEvent>) => Promise<void>
  deleteEvent: (id: string) => Promise<void>
  // activities
  createActivity: (title: string, contextType: ActivityContext, contextId: string, isPreset?: boolean) => Promise<void>
  toggleActivity: (id: string) => Promise<void>
  deleteActivity: (id: string) => Promise<void>
  activitiesFor: (contextType: ActivityContext, contextId: string) => Activity[]
}

export const useCrewStore = create<CrewState & CrewActions>()((set, get) => ({
  members: [],
  groups: [],
  events: [],
  activities: [],
  groupMemberships: {},
  loading: false,
  error: null,

  fetchAll: async () => {
    const owner = await uid()
    if (!owner) return
    set({ loading: true, error: null })

    const orgId = useWorkspaceStore.getState().activeOrgId()

    try {
      // Build base queries scoped to the active workspace
      const membersQ   = orgId
        ? supabase.from('members').select('*').eq('organization_id', orgId).order('created_at', { ascending: true })
        : supabase.from('members').select('*').eq('owner_id', owner).is('organization_id', null).order('created_at', { ascending: true })

      const groupsQ    = orgId
        ? supabase.from('groups').select('*').eq('organization_id', orgId).order('created_at', { ascending: true })
        : supabase.from('groups').select('*').eq('owner_id', owner).is('organization_id', null).order('created_at', { ascending: true })

      const eventsQ    = orgId
        ? supabase.from('events').select('*').eq('organization_id', orgId).order('event_date', { ascending: true })
        : supabase.from('events').select('*').eq('owner_id', owner).is('organization_id', null).order('event_date', { ascending: true })

      const activitiesQ = orgId
        ? supabase.from('activities').select('*').eq('organization_id', orgId)
        : supabase.from('activities').select('*').eq('owner_id', owner).is('organization_id', null)

      const [mRes, gRes, eRes, aRes] = await Promise.all([membersQ, groupsQ, eventsQ, activitiesQ])

      // Fetch group_members only for the groups we loaded (scoped to workspace)
      const groupIds = (gRes.data ?? []).map((g: Record<string, unknown>) => g.id as string)
      const gmRes = groupIds.length > 0
        ? await supabase.from('group_members').select('*').in('group_id', groupIds)
        : { data: [] as Record<string, unknown>[] }

      const memberships: Record<string, string[]> = {}
      ;(gmRes.data ?? []).forEach((gm: Record<string, unknown>) => {
        const gId = gm.group_id as string
        const mId = gm.member_id as string
        ;(memberships[gId] ??= []).push(mId)
      })
      set({
        members:    (mRes.data ?? []).map(rowToMember),
        groups:     (gRes.data ?? []).map(rowToGroup),
        events:     (eRes.data ?? []).map(rowToEvent),
        activities: (aRes.data ?? []).map(rowToActivity),
        groupMemberships: memberships,
        loading: false,
      })
    } catch (err) {
      set({ error: String(err), loading: false })
    }
  },

  // ── Members ──────────────────────────────────────────────────────────────
  createMember: async m => {
    const owner = await uid()
    if (!owner) return
    const orgId = useWorkspaceStore.getState().activeOrgId()
    const { data, error } = await supabase.from('members').insert({
      owner_id: owner,
      organization_id: orgId,
      first_name: m.firstName,
      last_name: m.lastName ?? null,
      nickname: m.nickname ?? null,
      phone: m.phone ?? null,
      email: m.email ?? null,
      type: m.type,
      level: m.level ?? null,
      role: m.role ?? null,
      notes: m.notes ?? null,
    }).select().single()
    if (error || !data) { set({ error: String(error?.message) }); return }
    set(s => ({ members: [...s.members, rowToMember(data)] }))
  },

  updateMember: async (id, patch) => {
    const row: Record<string, unknown> = {}
    if (patch.firstName !== undefined) row.first_name = patch.firstName
    if (patch.lastName  !== undefined) row.last_name  = patch.lastName ?? null
    if (patch.nickname  !== undefined) row.nickname   = patch.nickname ?? null
    if (patch.phone     !== undefined) row.phone      = patch.phone ?? null
    if (patch.email     !== undefined) row.email      = patch.email ?? null
    if (patch.type      !== undefined) row.type       = patch.type
    if (patch.level     !== undefined) row.level      = patch.level ?? null
    if (patch.role      !== undefined) row.role       = patch.role ?? null
    if (patch.notes     !== undefined) row.notes      = patch.notes ?? null
    const { error } = await supabase.from('members').update(row).eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ members: s.members.map(m => m.id === id ? { ...m, ...patch } : m) }))
  },

  deleteMember: async id => {
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ members: s.members.filter(m => m.id !== id) }))
  },

  // ── Groups ─────────────────────────────────────────────────────────────────
  createGroup: async name => {
    const owner = await uid()
    if (!owner) return null
    const orgId = useWorkspaceStore.getState().activeOrgId()
    const { data, error } = await supabase.from('groups').insert({ owner_id: owner, organization_id: orgId, name }).select().single()
    if (error || !data) { set({ error: String(error?.message) }); return null }
    const g = rowToGroup(data)
    set(s => ({ groups: [...s.groups, g] }))
    return g
  },

  updateGroup: async (id, name) => {
    const { error } = await supabase.from('groups').update({ name }).eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ groups: s.groups.map(g => g.id === id ? { ...g, name } : g) }))
  },

  deleteGroup: async id => {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => {
      const gm = { ...s.groupMemberships }; delete gm[id]
      return { groups: s.groups.filter(g => g.id !== id), groupMemberships: gm }
    })
  },

  setMemberGroups: async (memberId, groupIds) => {
    // borrar todas las relaciones del member y reinsertar
    await supabase.from('group_members').delete().eq('member_id', memberId)
    if (groupIds.length) {
      await supabase.from('group_members').insert(groupIds.map(gId => ({ group_id: gId, member_id: memberId })))
    }
    set(s => {
      const gm: Record<string, string[]> = {}
      // reconstruir membership map
      for (const [gId, members] of Object.entries(s.groupMemberships)) {
        gm[gId] = members.filter(mId => mId !== memberId)
      }
      groupIds.forEach(gId => { (gm[gId] ??= []).push(memberId) })
      return { groupMemberships: gm }
    })
  },

  membersOfGroup: groupId => {
    const ids = get().groupMemberships[groupId] ?? []
    return get().members.filter(m => ids.includes(m.id))
  },

  groupsOfMember: memberId => {
    const { groupMemberships, groups } = get()
    const gIds = Object.entries(groupMemberships).filter(([, ms]) => ms.includes(memberId)).map(([gId]) => gId)
    return groups.filter(g => gIds.includes(g.id))
  },

  // ── Events ───────────────────────────────────────────────────────────────
  createEvent: async e => {
    const owner = await uid()
    if (!owner) return null
    const orgId = useWorkspaceStore.getState().activeOrgId()
    const { data, error } = await supabase.from('events').insert({
      owner_id: owner,
      organization_id: orgId,
      name: e.name,
      event_date: e.eventDate ?? null,
      location: e.location ?? null,
      group_id: e.groupId ?? null,
    }).select().single()
    if (error || !data) { set({ error: String(error?.message) }); return null }
    const ev = rowToEvent(data)
    set(s => ({ events: [...s.events, ev] }))
    return ev
  },

  updateEvent: async (id, patch) => {
    const row: Record<string, unknown> = {}
    if (patch.name      !== undefined) row.name       = patch.name
    if (patch.eventDate !== undefined) row.event_date = patch.eventDate ?? null
    if (patch.location  !== undefined) row.location   = patch.location ?? null
    if (patch.groupId   !== undefined) row.group_id   = patch.groupId ?? null
    const { error } = await supabase.from('events').update(row).eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ events: s.events.map(ev => ev.id === id ? { ...ev, ...patch } : ev) }))
  },

  deleteEvent: async id => {
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ events: s.events.filter(ev => ev.id !== id) }))
  },

  // ── Activities ─────────────────────────────────────────────────────────────
  createActivity: async (title, contextType, contextId, isPreset = false) => {
    const owner = await uid()
    if (!owner) return
    const orgId = useWorkspaceStore.getState().activeOrgId()
    const { data, error } = await supabase.from('activities').insert({
      owner_id: owner, organization_id: orgId, title, context_type: contextType, context_id: contextId, is_preset: isPreset,
    }).select().single()
    if (error || !data) { set({ error: String(error?.message) }); return }
    set(s => ({ activities: [...s.activities, rowToActivity(data)] }))
  },

  toggleActivity: async id => {
    const act = get().activities.find(a => a.id === id)
    if (!act) return
    const { error } = await supabase.from('activities').update({ done: !act.done }).eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ activities: s.activities.map(a => a.id === id ? { ...a, done: !a.done } : a) }))
  },

  deleteActivity: async id => {
    const { error } = await supabase.from('activities').delete().eq('id', id)
    if (error) { set({ error: error.message }); return }
    set(s => ({ activities: s.activities.filter(a => a.id !== id) }))
  },

  activitiesFor: (contextType, contextId) =>
    get().activities.filter(a => a.contextType === contextType && a.contextId === contextId),
}))
