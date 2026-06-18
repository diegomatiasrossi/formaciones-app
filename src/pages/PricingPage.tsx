import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { usePlan } from '@/hooks/usePlan'
import { useAuth } from '@/features/auth/useAuth'

type Cycle = 'monthly' | 'yearly'

const PRICES = {
  solo_pro: {
    monthly: { id: import.meta.env.VITE_STRIPE_PRICE_SOLO_PRO_MONTHLY ?? '', label: '$9.99', period: '/mes' },
    yearly:  { id: import.meta.env.VITE_STRIPE_PRICE_SOLO_PRO_YEARLY  ?? '', label: '$7.99', period: '/mes · cobrado anual' },
  },
  studio: {
    monthly: { id: import.meta.env.VITE_STRIPE_PRICE_STUDIO_MONTHLY ?? '', label: '$24.99', period: '/mes' },
    yearly:  { id: import.meta.env.VITE_STRIPE_PRICE_STUDIO_YEARLY  ?? '', label: '$19.99', period: '/mes · cobrado anual' },
  },
}

export function PricingPage() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const { planName, startCheckout } = usePlan()
  const [cycle, setCycle]           = useState<Cycle>('monthly')
  const [loading, setLoading]       = useState<string | null>(null)

  async function handleCta(plan: 'solo_pro' | 'studio') {
    if (!user) { navigate('/login?redirect=/pricing'); return }
    const price = PRICES[plan][cycle]
    if (!price.id) { alert('Stripe no configurado aún — volvé pronto.'); return }
    try {
      setLoading(plan)
      await startCheckout(price.id, user.email ?? '')
    } catch {
      alert('Error al iniciar el pago. Intentá de nuevo.')
      setLoading(null)
    }
  }

  const isCurrentPlan = (p: string) => planName === p

  return (
    <div className="min-h-screen bg-negro text-blanco-calido flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-borde/60">
        <button onClick={() => navigate(-1)} className="text-gris hover:text-blanco-calido text-sm transition-colors flex items-center gap-1">
          ← Volver
        </button>
        <Logo size={24} light />
      </nav>

      <div className="flex-1 max-w-5xl mx-auto px-8 py-16 w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Planes</div>
          <h1 className="text-4xl font-light tracking-tight mb-3">Elegí tu plan</h1>
          <p className="text-gris text-sm">Empezá gratis. Pagás cuando crece tu proyecto.</p>

          {/* Toggle monthly / yearly */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <button
              onClick={() => setCycle('monthly')}
              className={`text-sm px-4 py-1.5 rounded-full transition-colors ${cycle === 'monthly' ? 'bg-dorado/15 text-dorado border border-dorado/30' : 'text-gris hover:text-blanco-calido'}`}
            >
              Mensual
            </button>
            <button
              onClick={() => setCycle('yearly')}
              className={`text-sm px-4 py-1.5 rounded-full transition-colors ${cycle === 'yearly' ? 'bg-dorado/15 text-dorado border border-dorado/30' : 'text-gris hover:text-blanco-calido'}`}
            >
              Anual <span className="text-xs text-green-400 ml-1">−20%</span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Free */}
          <div className="rounded-2xl border border-borde/60 p-6 flex flex-col gap-4 bg-[#0f0f0f]">
            <div>
              <div className="text-base font-medium">Free</div>
              <div className="text-[10px] text-gris/50 mb-3">Para explorar</div>
              <div className="text-3xl font-light text-dorado">$0</div>
            </div>
            <ul className="space-y-2 flex-1">
              {['15 bailarines por escena', '2 proyectos', 'Canvas drag & drop', '20+ formaciones', 'Link de solo lectura'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-blanco-calido/75">
                  <span className="text-green-400/70 mt-0.5 shrink-0">✓</span>{f}
                </li>
              ))}
              {['Audio + timeline', 'Canon', 'PDF export', 'Estadísticas'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-gris/35">
                  <span className="shrink-0 mt-0.5">✕</span>{f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="w-full py-2.5 rounded-xl text-sm border border-borde text-gris/50 cursor-default"
            >
              {isCurrentPlan('free') ? 'Plan actual' : 'Gratis siempre'}
            </button>
          </div>

          {/* Solo Pro */}
          <div className="rounded-2xl border border-dorado/50 p-6 flex flex-col gap-4 bg-dorado/5 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] text-negro font-bold bg-dorado px-3 py-1 rounded-full uppercase tracking-wider">
              Más popular
            </div>
            <div>
              <div className="text-base font-medium">Solo Pro</div>
              <div className="text-[10px] text-gris/50 mb-3">Para coreógrafos activos</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-dorado">{PRICES.solo_pro[cycle].label}</span>
                <span className="text-gris text-xs">{PRICES.solo_pro[cycle].period}</span>
              </div>
              {cycle === 'monthly' && (
                <div className="text-[10px] text-dorado/60 mt-1">14 días gratis · sin tarjeta al inicio</div>
              )}
            </div>
            <ul className="space-y-2 flex-1">
              {['50 bailarines por escena', 'Proyectos ilimitados', 'Todo de Free', 'Audio + timeline', 'Transiciones en canon', 'PDF sin marca de agua'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-blanco-calido/75">
                  <span className="text-green-400/70 mt-0.5 shrink-0">✓</span>{f}
                </li>
              ))}
              {['Estadísticas avanzadas'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-gris/35">
                  <span className="shrink-0 mt-0.5">✕</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCta('solo_pro')}
              disabled={!!loading || isCurrentPlan('solo_pro')}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-colors bg-dorado hover:bg-dorado-oscuro text-negro disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'solo_pro' ? 'Redirigiendo...' : isCurrentPlan('solo_pro') ? 'Plan actual' : 'Empezar Solo Pro →'}
            </button>
          </div>

          {/* Studio */}
          <div className="rounded-2xl border border-borde/40 p-6 flex flex-col gap-4 bg-[#0f0f0f]">
            <div>
              <div className="text-base font-medium">Studio</div>
              <div className="text-[10px] text-gris/50 mb-3">Para academias y equipos</div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-light text-dorado">{PRICES.studio[cycle].label}</span>
                <span className="text-gris text-xs">{PRICES.studio[cycle].period}</span>
              </div>
            </div>
            <ul className="space-y-2 flex-1">
              {['Bailarines ilimitados', 'Proyectos ilimitados', 'Todo de Solo Pro', 'Estadísticas + mapa de zonas', 'Hasta 5 usuarios', 'Soporte prioritario'].map(f => (
                <li key={f} className="flex items-start gap-2 text-xs text-blanco-calido/75">
                  <span className="text-green-400/70 mt-0.5 shrink-0">✓</span>{f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCta('studio')}
              disabled={!!loading || isCurrentPlan('studio')}
              className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors border border-dorado/40 text-dorado hover:bg-dorado/10 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading === 'studio' ? 'Redirigiendo...' : isCurrentPlan('studio') ? 'Plan actual' : 'Empezar Studio →'}
            </button>
          </div>

        </div>

        {/* Footer notes */}
        <div className="text-center mt-10 space-y-2">
          <p className="text-[11px] text-gris/40">
            Pagos procesados por Stripe · Cancelá cuando quieras desde tu panel
          </p>
          <p className="text-[11px] text-gris/30">
            El cobro es en USD. Si estás en Argentina, tu banco puede aplicar impuestos adicionales (PAÍS, PAIS, etc.)
          </p>
        </div>
      </div>
    </div>
  )
}
