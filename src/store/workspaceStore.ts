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
  loadMemberships: () => Promise<void>
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

  loadMemberships: async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load orgs the user belongs to (joined only — not pending invites)
    const { data, error } = await supabase
      .from('organization_members')
      .select('organization_id, role, joined_at, organizations(id, name)')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)

    if (error) {
      console.error('[workspace] loadMemberships query error:', error)
    }
    console.log('[workspace] loadMemberships raw data:', JSON.stringify(data))

    const memberships: OrgMembership[] = (data ?? []).map((row: Record<string, unknown>) => {
      const org = row.organizations as { id: string; name: string } | null
      return {
        organizationId: row.organization_id as string,
        organizationName: org?.name ?? '',
        role: row.role as OrgRole,
        joinedAt: row.joined_at as string | undefined,
      }
    })

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
