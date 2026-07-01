// Fuente única de verdad de los planes. La usan LandingPage y PricingPage para
// evitar arrays duplicados/desincronizados. Los textos son claves i18n
// (namespace `pricing.*`); los precios de LandingPage son estáticos de display
// (PricingPage usa precios dinámicos de Stripe según el ciclo).

export type PlanId = 'free' | 'solo_pro' | 'studio'

export interface PlanFeature {
  key: string        // clave i18n del texto de la feature
  available: boolean // false = tachada (solo se muestra en PricingPage)
}

export interface PricingPlan {
  id: PlanId
  name: string             // nombre propio, no se traduce (Free / Solo Pro / Studio)
  descKey: string          // clave i18n
  ctaKey: string           // clave i18n (CTA de LandingPage)
  price: string            // precio de display estático (LandingPage)
  periodKey: string | null // clave i18n del período; null = sin período
  highlight: boolean
  features: PlanFeature[]
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    descKey: 'pricing.free_desc',
    ctaKey: 'pricing.cta_free',
    price: '$0',
    periodKey: null,
    highlight: false,
    features: [
      { key: 'pricing.feat_members_10', available: true },
      { key: 'pricing.feat_projects_3', available: true },
      { key: 'pricing.feat_groups_3', available: true },
      { key: 'pricing.feat_events_3', available: true },
      { key: 'pricing.feat_formations_20', available: true },
      { key: 'pricing.feat_preview', available: true },
      { key: 'pricing.feat_readonly', available: true },
      { key: 'pricing.feat_audio', available: false },
      { key: 'pricing.feat_canon_short', available: false },
      { key: 'pricing.feat_pdf_export', available: false },
      { key: 'pricing.feat_stats', available: false },
    ],
  },
  {
    id: 'solo_pro',
    name: 'Solo Pro',
    descKey: 'pricing.solo_pro_desc',
    ctaKey: 'pricing.cta_solo_pro',
    price: '$9.99',
    periodKey: 'pricing.per_month',
    highlight: true,
    features: [
      { key: 'pricing.feat_members_50', available: true },
      { key: 'pricing.feat_projects_unlimited', available: true },
      { key: 'pricing.feat_all_free', available: true },
      { key: 'pricing.feat_audio', available: true },
      { key: 'pricing.feat_canon', available: true },
      { key: 'pricing.feat_pdf', available: true },
      { key: 'pricing.feat_stats_advanced', available: false },
    ],
  },
  {
    id: 'studio',
    name: 'Studio',
    descKey: 'pricing.studio_desc',
    ctaKey: 'pricing.cta_studio',
    price: '$24.99',
    periodKey: 'pricing.per_month',
    highlight: false,
    features: [
      { key: 'pricing.feat_members_unlimited', available: true },
      { key: 'pricing.feat_projects_unlimited', available: true },
      { key: 'pricing.feat_all_solo_pro', available: true },
      { key: 'pricing.feat_stats_zones', available: true },
      { key: 'pricing.feat_users_3', available: true },
      { key: 'pricing.feat_priority_support', available: true },
    ],
  },
]

export const getPlan = (id: PlanId): PricingPlan =>
  PRICING_PLANS.find(p => p.id === id)!
