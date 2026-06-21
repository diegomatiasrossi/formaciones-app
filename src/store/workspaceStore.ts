import { create } from 'zustand'
import { supabase } from '@/features/auth/supabaseClient'
import type { OrgMembership, OrgRole } from '@/types'

export type ActiveWorkspace =
  | { type: 'personal' }
  | { type: 'org'; orgId: string; orgName: string; role: OrgRole }

interface WorkspaceState {
  activeWorkspace: ActiveWorkspace
  memberships: OrgMembership[]
  membershipsLoaded: boolean
}

interface WorkspaceActions {
  loadMemberships: (userId?: string) => Promise<void>
  switchToPersonal: () => void
  switchToOrg: (orgId: string) => void
  activeOrgId: () => string | null
}

export const useWorkspaceStore = create<WorkspaceState & WorkspaceActions>()((set, get) => ({
  activeWorkspace: { type: 'personal' },
  memberships: [],
  membershipsLoaded: false,

  activeOrgId: () => {
    const ws = get().activeWorkspace
    return ws.type === 'org' ? ws.orgId : null
  },

  loadMemberships: async (userId?: string) => {
    // Prefer the userId passed directly (avoids extra network call right after OAuth redirect)
    let uid = userId
    if (!uid) {
      const { data: { user } } = await supabase.auth.getUser()
      uid = user?.id
    }
    if (!uid) {
      console.warn('[workspace] loadMemberships: no authenticated user')
      return
    }
    console.log('[workspace] loadMemberships: fetching for user', uid)

    // Two separate queries — avoids PostgREST embedded-join RLS chain issues
    const { data: membData, error: membError } = await supabase
      .from('organization_members')
      .select('organization_id, role, joined_at')
      .eq('user_id', uid)

    if (membError) console.error('[workspace] organization_members query error:', membError)
    console.log('[workspace] organization_members rows:', JSON.stringify(membData))

    const rows = membData ?? []
    if (rows.length === 0) {
      set({ memberships: [], membershipsLoaded: true })
      return
    }

    const orgIds = rows.map(r => r.organization_id as string)
    const { data: orgsData, error: orgsError } = await supabase
      .from('organizations')
      .select('id, name')
      .in('id', orgIds)

    if (orgsError) console.error('[workspace] organizations query error:', orgsError)
    console.log('[workspace] organizations data:', JSON.stringify(orgsData))

    const orgNames = new Map((orgsData ?? []).map(o => [o.id as string, o.name as string]))

    const memberships: OrgMembership[] = rows.map((row: Record<string, unknown>) => ({
      organizationId: row.organization_id as string,
      organizationName: orgNames.get(row.organization_id as string) ?? '',
      role: row.role as OrgRole,
      joinedAt: row.joined_at as string | undefined,
    }))

    console.log('[workspace] computed memberships:', memberships)
    set({ memberships, membershipsLoaded: true })
  },

  switchToPersonal: () => {
    set({ activeWorkspace: { type: 'personal' } })
  },

  switchToOrg: (orgId: string) => {
    const { memberships } = get()
    console.log('[workspace] switchToOrg called with orgId:', orgId)
    console.log('[workspace] current memberships:', memberships)
    const membership = memberships.find(m => m.organizationId === orgId)
    console.log('[workspace] found membership:', membership)
    if (!membership) {
      console.warn('[workspace] switchToOrg: membership not found in store for orgId:', orgId)
      return
    }
    set({
      activeWorkspace: {
        type: 'org',
        orgId: membership.organizationId,
        orgName: membership.organizationName,
        role: membership.role,
      },
    })
    console.log('[workspace] activeWorkspace updated to org:', membership.organizationId)
  },
}))
