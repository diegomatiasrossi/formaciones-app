/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_APP_URL: string
  readonly VITE_STRIPE_PUBLISHABLE_KEY: string
  readonly VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY: string
  readonly VITE_STRIPE_PRICE_SOLO_PRO_YEARLY: string
  readonly VITE_STRIPE_PRICE_STUDIO_MONTHLY: string
  readonly VITE_STRIPE_STUDIO_PRICE_ID: string
  readonly VITE_STRIPE_PRICE_STUDIO_YEARLY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
