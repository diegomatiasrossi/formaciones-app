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
}

export function UpgradeGate({ requiredPlan, featureName, compact, className }: Props) {
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

  return (
    <div className={`flex flex-col items-center justify-center gap-3 p-6 text-center ${className ?? ''}`}>
      <span className="text-3xl opacity-60">🔒</span>
      <div>
        <p className="text-xs text-blanco-calido/80 font-medium">{featureName}</p>
        <p className="text-[11px] text-gris/60 mt-1">
          Disponible en el plan <span className="text-dorado">{label}</span>
        </p>
      </div>
      <button
        onClick={() => navigate('/pricing')}
        className="px-4 py-1.5 text-[11px] border border-dorado/40 text-dorado hover:bg-dorado/10 rounded-lg transition-colors"
      >
        Ver planes →
      </button>
    </div>
  )
}
