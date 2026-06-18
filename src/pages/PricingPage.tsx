import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    subtitle: 'Para explorar',
    color: 'border-borde',
    features: [
      '15 bailarines por escena',
      '2 proyectos',
      'Canvas drag-drop',
      'Formaciones prediseñadas',
      'Compartir (solo lectura)',
    ],
    locked: [
      'Base de datos de integrantes',
      'Checklist de producción',
      'Audio sync + timeline',
      'Transiciones en canon',
      'Exportar PDF',
    ],
    cta: 'Plan actual',
    ctaDisabled: true,
    highlight: false,
  },
  {
    name: 'Starter',
    price: '$1',
    period: ' único',
    subtitle: 'Para empezar',
    color: 'border-borde/60',
    features: [
      '30 bailarines por escena',
      '3 proyectos',
      'Todo de Free',
      'Base de datos de integrantes',
    ],
    locked: [
      'Checklist de producción completo',
      'Audio sync + timeline',
      'Transiciones en canon',
      'Exportar PDF',
    ],
    cta: 'Empezar por $1',
    ctaDisabled: false,
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$10',
    period: ' / proyecto',
    subtitle: 'Para crecer',
    color: 'border-dorado/60',
    features: [
      '50 bailarines por escena',
      'Proyectos ilimitados',
      'Todo de Starter',
      'Checklist de producción completo',
      'Audio sync + timeline',
      'Transiciones en canon',
      'Exportar PDF sin marca de agua',
    ],
    locked: [
      'Estadísticas y mapa de zonas',
    ],
    cta: 'Empezar Pro',
    ctaDisabled: false,
    highlight: true,
  },
  {
    name: 'Studio',
    price: '$50',
    period: ' /mes',
    subtitle: 'Para equipos',
    color: 'border-borde/40',
    features: [
      'Bailarines ilimitados',
      'Hasta 100 proyectos',
      'Todo de Pro',
      'Estadísticas y mapa de zonas',
      'Bonus a los 3 meses: timeline + niveles avanzados',
    ],
    locked: [],
    cta: 'Empezar Studio',
    ctaDisabled: false,
    highlight: false,
  },
]

export function PricingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-negro text-blanco-calido flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-borde/60">
        <button
          onClick={() => navigate(-1)}
          className="text-gris hover:text-blanco-calido text-sm transition-colors flex items-center gap-1"
        >
          ← Volver
        </button>
        <Logo size={26} light />
      </nav>

      <div className="flex-1 max-w-6xl mx-auto px-8 py-16 w-full">
        <div className="text-center mb-14">
          <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Planes</div>
          <h1 className="text-4xl font-light tracking-tight mb-3">Elegí tu plan</h1>
          <p className="text-gris text-sm">Empezá gratis. Pagás cuando crece tu proyecto.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-5 flex flex-col gap-4 ${plan.color} ${plan.highlight ? 'bg-dorado/5' : 'bg-[#0f0f0f]'}`}
            >
              <div>
                {plan.highlight && (
                  <div className="text-[9px] text-dorado uppercase tracking-[0.3em] mb-2">Más popular</div>
                )}
                <div className="text-base font-medium">{plan.name}</div>
                <div className="text-[10px] text-gris/50 mb-2">{plan.subtitle}</div>
                <div className="flex items-baseline gap-0">
                  <span className="text-2xl font-light text-dorado">{plan.price}</span>
                  <span className="text-gris text-xs">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-1.5 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-blanco-calido/80">
                    <span className="text-green-400/70 mt-0.5 shrink-0">✓</span>
                    {f}
                  </li>
                ))}
                {plan.locked.map(f => (
                  <li key={f} className="flex items-start gap-1.5 text-xs text-gris/35">
                    <span className="shrink-0 mt-0.5">✕</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.ctaDisabled}
                onClick={() => !plan.ctaDisabled && navigate('/projects')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  plan.ctaDisabled
                    ? 'border border-borde text-gris/50 cursor-default'
                    : plan.highlight
                    ? 'bg-dorado hover:bg-dorado-oscuro text-negro'
                    : 'border border-dorado/40 text-dorado hover:bg-dorado/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-gris/40 mt-10">
          Stripe próximamente · Por ahora todos los planes son de acceso anticipado gratuito
        </p>
      </div>
    </div>
  )
}
