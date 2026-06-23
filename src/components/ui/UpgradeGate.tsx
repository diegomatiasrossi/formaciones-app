import { useNavigate } from 'react-router-dom'

const PLAN_LABELS = {
  starter: 'Starter',
  pro: 'Pro',
  studio: 'Studio',
  solo_pro: 'Pro',
}

interface Props {
  requiredPlan: 'starter' | 'pro' | 'studio' | 'solo_pro'
  featureName: string
  compact?: boolean
  className?: string
  // New contextual copy — when provided, overrides the generic featureName layout
  headline?: string
  description?: string
  ctaText?: string
  // When true, uses dark text (for light backgrounds like white cards)
  lightBg?: boolean
}

export function UpgradeGate({
  requiredPlan, featureName, compact, className,
  headline, description, ctaText, lightBg,
}: Props) {
  const navigate = useNavigate()
  const label = PLAN_LABELS[requiredPlan]

  if (compact) {
    return (
      <span
        title={`${featureName} requiere plan ${label}`}
        className="ml-1 text-gris/40 text-[10px] cursor-default select-none"
      >
        🔒
      </span>
    )
  }

  const headlineColor   = lightBg ? 'text-negro font-semibold'             : 'text-blanco-calido font-semibold'
  const bodyColor       = lightBg ? 'text-gris'                            : 'text-gris/60'
  const featureColor    = lightBg ? 'text-negro/80 font-medium'            : 'text-blanco-calido/80 font-medium'
  const planLabelColor  = lightBg ? 'text-dorado-oscuro'                   : 'text-dorado'

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${className ?? ''}`}>
      <span className="text-3xl opacity-60">🔒</span>

      <div className="space-y-1">
        {headline ? (
          <>
            <p className={`text-sm ${headlineColor}`}>{headline}</p>
            {description && (
              <p className={`text-[11px] leading-relaxed ${bodyColor}`}>{description}</p>
            )}
          </>
        ) : (
          <>
            <p className={`text-xs ${featureColor}`}>{featureName}</p>
            <p className={`text-[11px] ${bodyColor}`}>
              Disponible en el plan <span className={planLabelColor}>{label}</span>
            </p>
          </>
        )}
      </div>

      <button
        onClick={() => navigate('/pricing')}
        className="px-4 py-2 text-[11px] font-semibold bg-rojo hover:bg-rojo-oscuro text-blanco rounded-lg transition-colors"
      >
        {ctaText ?? 'Ver planes →'}
      </button>
    </div>
  )
}
