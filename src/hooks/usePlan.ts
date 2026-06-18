import { useEffect, useState } from 'react'
import { supabase } from '@/features/auth/supabaseClient'
import { useAuth } from '@/features/auth/useAuth'

export type PlanName = 'free' | 'starter' | 'pro' | 'studio'

export interface PlanFeatures {
  maxDancers: number
  maxProjects: number
  membersEnabled: boolean
  checklistEnabled: boolean
  audioEnabled: boolean
  canonEnabled: boolean
  statsEnabled: boolean
  pdfExport: boolean
}

export const PLAN_FEATURES: Record<PlanName, PlanFeatures> = {
  free: {
    maxDancers: 15,
    maxProjects: 2,
    membersEnabled: false,
    checklistEnabled: false,
    audioEnabled: false,
    canonEnabled: false,
    statsEnabled: false,
    pdfExport: false,
  },
  starter: {
    maxDancers: 30,
    maxProjects: 3,
    membersEnabled: true,
    checklistEnabled: false,
    audioEnabled: false,
    canonEnabled: false,
    statsEnabled: false,
    pdfExport: false,
  },
  pro: {
    maxDancers: 50,
    maxProjects: Infinity,
    membersEnabled: true,
    checklistEnabled: true,
    audioEnabled: true,
    canonEnabled: true,
    statsEnabled: false,
    pdfExport: true,
  },
  studio: {
    maxDancers: Infinity,
    maxProjects: 100,
    membersEnabled: true,
    checklistEnabled: true,
    audioEnabled: true,
    canonEnabled: true,
    statsEnabled: true,
    pdfExport: true,
  },
}

export function usePlan() {
  const { user } = useAuth()
  const [planName, setPlanName] = useState<PlanName>('free')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }

    supabase
      .from('user_plans')
      .select('plan')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.plan && data.plan in PLAN_FEATURES) {
          setPlanName(data.plan as PlanName)
        }
        setLoading(false)
      })
  }, [user])

  const features = PLAN_FEATURES[planName]

  return {
    planName,
    features,
    loading,
    canCreateProject: (currentCount: number) => currentCount < features.maxProjects,
    can: (feature: keyof PlanFeatures) => Boolean(features[feature]),
  }
}
