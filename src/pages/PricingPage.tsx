import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Logo } from '@/components/ui/Logo'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/features/auth/useAuth'
import { getPlan } from '@/data/pricingPlans'
import { trackEvent } from '@/lib/metaPixel'

type Cycle = 'monthly' | 'yearly'

const PRICES = {
  solo_pro: {
    monthly: { id: import.meta.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY ?? '', label: '$9.99' },
    yearly:  { id: import.meta.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY  ?? '', label: '$7.99' },
  },
  studio: {
    monthly: { id: import.meta.env.VITE_STRIPE_STUDIO_PRICE_ID ?? '', label: '$24.99' },
    yearly:  { id: import.meta.env.VITE_STRIPE_PRICE_STUDIO_YEARLY  ?? '', label: '$19.99' },
  },
}

export function PricingPage() {
  const { t }     = useTranslation()
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { planName, startCheckout } = usePlan()
  const [cycle, setCycle]           = useState<Cycle>('monthly')
  const [loading, setLoading]       = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  async function handleCta(plan: 'solo_pro' | 'studio') {
    if (!user) { navigate('/login?redirect=/pricing'); return }
    setCheckoutError(null)
    const price = PRICES[plan][cycle]
    if (!price.id) { setCheckoutError(t('pricing.checkout_unavailable')); return }
    try {
      setLoading(plan)
      trackEvent('InitiateCheckout', { content_name: plan })
      await startCheckout(price.id, user.email ?? '')
    } catch (err) {
      // Mostrar el mensaje real del backend (no un genérico) para poder diagnosticar.
      const message = err instanceof Error ? err.message : t('pricing.checkout_error')
      setCheckoutError(message)
      setLoading(null)
    }
  }

  const isCurrentPlan = (p: string) => planName === p

  return (
    <div className="min-h-screen bg-crema text-negro flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-borde-light bg-blanco">
        <button onClick={() => navigate(-1)} className="text-gris hover:text-negro text-sm transition-colors flex items-center gap-1">
          ← {t('pricing.back')}
        </button>
        <Logo size={24} />
      </nav>

      <div className="flex-1 max-w-5xl mx-auto px-8 py-16 w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[10px] text-rojo uppercase tracking-[0.3em] mb-3 font-semibold">{t('pricing.eyebrow')}</div>
          <h1 className="text-4xl font-semibold tracking-tight mb-3">{t('pricing.page_title')}</h1>
          <p className="text-gris text-sm">{t('pricing.page_subtitle')}</p>

          {/* Toggle */}
          <div className="flex items-center justify-center gap-2 mt-8 p-1 bg-blanco border border-borde-light rounded-full w-fit mx-auto">
            <button
              onClick={() => setCycle('monthly')}
              className={`text-sm px-5 py-1.5 rounded-full transition-colors ${cycle === 'monthly' ? 'bg-negro text-blanco' : 'text-gris hover:text-negro'}`}
            >
              {t('pricing.monthly')}
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`text-sm px-5 py-1.5 rounded-full transition-colors ${cycle === 'yearly' ? 'bg-negro text-blanco' : 'text-gris hover:text-negro'}`}
            >
              {t('pricing.yearly')} <span className="text-xs text-rojo ml-1 font-semibold">{t('pricing.yearly_discount')}</span>
            </button>
          </div>
        </div>

        {checkoutError && (
          <div className="max-w-md mx-auto mb-6 px-4 py-3 bg-rojo/8 border border-rojo/30 rounded-lg text-sm text-rojo text-center">
            {checkoutError}
          </div>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Free */}
          <div className="rounded-2xl border border-borde-light p-6 flex flex-col gap-4 bg-blanco shadow-soft">
            <div>
              <div className="text-base font-semibold">Free</div>
              <div className="text-[11px] text-gris mb-3">{t(getPlan('free').descKey)}</div>
              <div className="text-3xl font-semibold">$0</div>
            </div>
            <ul className="space-y-2 flex-1">
              {getPlan('free').features.map(f => (
                <li key={f.key} className={`flex items-start gap-2 text-xs ${f.available ? 'text-negro/75' : 'text-gris/40'}`}>
                  <span className={`shrink-0 mt-0.5 ${f.available ? 'text-green-600' : ''}`}>{f.available ? '✓' : '✕'}</span>{t(f.key)}
                </li>
              ))}
            </ul>
            <button disabled className="w-full py-2.5 rounded-xl text-sm border border-borde-light text-gris cursor-default">
              {isCurrentPlan('free') ? t('pricing.current_plan') : t('pricing.free_forever')}
            </button>
          </div>

          {/* Solo Pro */}
          <div className="rounded-2xl border-2 border-rojo p-6 flex flex-col gap-4 bg-blanco shadow-card relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-blanco font-bold bg-rojo px-3 py-1 rounded-full uppercase tracking-wider">
              {t('pricing.most_popular')}
            </div>
            <div>
              <div className="text-base font-semibold">Solo Pro</div>
              <div className="text-[11px] text-gris mb-3">{t(getPlan('solo_pro').descKey)}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-rojo">{PRICES.solo_pro[cycle].label}</span>
                <span className="text-gris text-xs">{t(cycle === 'yearly' ? 'pricing.per_month_yearly' : 'pricing.per_month')}</span>
              </div>
              {cycle === 'monthly' && (
                <div className="text-[10px] text-rojo/70 mt-1">{t('pricing.trial_note')}</div>
              )}
            </div>
            <ul className="space-y-2 flex-1">
              {getPlan('solo_pro').features.map(f => (
                <li key={f.key} className={`flex items-start gap-2 text-xs ${f.available ? 'text-negro/75' : 'text-gris/40'}`}>
                  <span className={`shrink-0 mt-0.5 ${f.available ? 'text-green-600' : ''}`}>{f.available ? '✓' : '✕'}</span>{t(f.key)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCta('solo_pro')}
              disabled={!!loading || isCurrentPlan('solo_pro')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-rojo hover:bg-rojo-oscuro text-blanco disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'solo_pro' ? t('pricing.redirecting') : isCurrentPlan('solo_pro') ? t('pricing.current_plan') : `${t('pricing.cta_solo_pro')} →`}
            </button>
          </div>

          {/* Studio */}
          <div className="rounded-2xl border border-borde-light p-6 flex flex-col gap-4 bg-blanco shadow-soft">
            <div>
              <div className="text-base font-semibold">Studio</div>
              <div className="text-[11px] text-gris mb-3">{t(getPlan('studio').descKey)}</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold text-dorado">{PRICES.studio[cycle].label}</span>
                <span className="text-gris text-xs">{t(cycle === 'yearly' ? 'pricing.per_month_yearly' : 'pricing.per_month')}</span>
              </div>
            </div>
            <ul className="space-y-2 flex-1">
              {getPlan('studio').features.map(f => (
                <li key={f.key} className={`flex items-start gap-2 text-xs ${f.available ? 'text-negro/75' : 'text-gris/40'}`}>
                  <span className={`shrink-0 mt-0.5 ${f.available ? 'text-green-600' : ''}`}>{f.available ? '✓' : '✕'}</span>{t(f.key)}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCta('studio')}
              disabled={!!loading || isCurrentPlan('studio')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors border-2 border-dorado text-dorado-oscuro hover:bg-dorado/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'studio' ? t('pricing.redirecting') : isCurrentPlan('studio') ? t('pricing.current_plan') : `${t('pricing.cta_studio')} →`}
            </button>
          </div>

        </div>

        {/* Footer notes */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-[11px] text-gris/60">{t('pricing.footer_payment')}</p>
          <p className="text-[11px] text-gris/50">{t('pricing.footer_usd')}</p>
        </div>
      </div>
    </div>
  )
}
