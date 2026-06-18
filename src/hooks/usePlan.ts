import { useEffect, useState } from 'react'
import { supabase } from '@/features/auth/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'

export type PlanName = 'free' | 'solo_pro' | 'studio'

export interface PlanFeatures {
  maxDancers: number       // Infinity = sin límite
  maxProjects: number      // Infinity = sin límite
  audioEnabled: boolean
  canonEnabled: boolean
  statsEnabled: boolean
  pdfExport: boolean
  maxCollaborators: number // 1 = solo el dueño
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  free: {
    maxDancers:       15,
    maxProjects:      2,
    audioEnabled:     false,
    canonEnabled:     false,
    statsEnabled:     false,
    pdfExport:        false,
    maxCollaborators: 1,
  },
  solo_pro: {
    maxDancers:       50,
    maxProjects:      Infinity,
    audioEnabled:     true,
    canonEnabled:     true,
    statsEnabled:     false,
    pdfExport:        true,
    maxCollaborators: 1,
  },
  studio: {
    maxDancers:       Infinity,
    maxProjects:      Infinity,
    audioEnabled:     true,
    canonEnabled:     true,
    statsEnabled:     true,
    pdfExport:        true,
    maxCollaborators: 5,
  },
}

export interface PlanState {
  planName: PlanName
  billingCycle: 'monthly' | 'yearly'
  subscriptionStatus: string | null
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  loading: boolean
}

export function usePlan(): PlanState & {
  features: PlanFeatures
  canCreateProject: (currentCount: number) => boolean
  can: (feature: keyof PlanFeatures) => boolean
  startCheckout: (priceId: string, userEmail: string) => Promise<void>
  openPortal: () => Promise<void>
} {
  const { user } = useAuth()
  const [state, setState] = useState<PlanState>({
    planName:           'free',
    billingCycle:       'monthly',
    subscriptionStatus: null,
    cancelAtPeriodEnd:  false,
    currentPeriodEnd:   null,
    loading:            true,
  })

  useEffect(() => {
    if (!user) { setState(s => ({ ...s, loading: false })); return }

    supabase
      .from('user_plans')
      .select('plan, billing_cycle, subscription_status, cancel_at_period_end, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setState({
          planName:           (data?.plan as PlanName) ?? 'free',
          billingCycle:       (data?.billing_cycle as 'monthly' | 'yearly') ?? 'monthly',
          subscriptionStatus: data?.subscription_status ?? null,
          cancelAtPeriodEnd:  data?.cancel_at_period_end ?? false,
          currentPeriodEnd:   data?.current_period_end ?? null,
          loading:            false,
        })
      })
  }, [user])

  const features = PLAN_FEATURES[state.planName]

  async function startCheckout(priceId: string, userEmail: string) {
    if (!user) return
    const res = await fetch('/api/stripe/checkout', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ price_id: priceId, user_id: user.id, user_email: userEmail }),
    })
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = url
  }

  async function openPortal() {
    if (!user) return
    const res = await fetch('/api/stripe/portal', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ user_id: user.id }),
    })
    const { url, error } = await res.json()
    if (error) throw new Error(error)
    window.location.href = url
  }

  return {
    ...state,
    features,
    canCreateProject: (n) => n < features.maxProjects,
    can:              (f)  => Boolean(features[f]),
    startCheckout,
    openPortal,
  }
}

// ── PASO 3: Límites por plan ──────────────────────────────────────────────────

export function checkPlanLimits(plan: PlanName) {
  return PLAN_FEATURES[plan]
}
