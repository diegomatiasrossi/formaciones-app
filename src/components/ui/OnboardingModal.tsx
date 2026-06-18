import { Logo } from './Logo'

interface Props {
  open: boolean
  onClose: () => void
}

const PILLARS = [
  {
    icon: '⬡',
    title: 'Espacio',
    desc: 'Canvas de formaciones con drag & drop. Hasta 50 integrantes, 20+ formaciones prediseñadas y animaciones entre escenas.',
    accentColor: '#C9343D',
  },
  {
    icon: '✓',
    title: 'Actividades',
    desc: 'Checklists de producción y planning semanal con tareas organizadas por etapas del proyecto.',
    accentColor: '#C9A961',
  },
  {
    icon: '◈',
    title: 'Eventos',
    desc: 'Registrá presentaciones y competencias. Seguimiento de preparación, fechas y estado de cada evento.',
    accentColor: '#C9343D',
  },
  {
    icon: '◉',
    title: 'Integrantes',
    desc: 'Base de datos de tu crew: nombre, estilos, música y notas personalizadas por proyecto.',
    accentColor: '#C9A961',
  },
]

export function OnboardingModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(26,26,26,0.7)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-2xl rounded-2xl overflow-hidden"
        style={{
          background: '#f5f5f0',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="flex justify-center mb-5">
            <Logo size={32} />
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a1a', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
            Bienvenido a Crewficina
          </h2>
          <p style={{ fontSize: 14, color: '#888', fontFamily: 'Inter, sans-serif', lineHeight: 1.5 }}>
            Tu oficina de planificación coreográfica. Activá los módulos que necesites.
          </p>
        </div>

        {/* 4 pillar cards */}
        <div className="grid grid-cols-2 gap-3 px-8 pb-6">
          {PILLARS.map(p => (
            <div
              key={p.title}
              style={{
                background: '#ffffff',
                border: '1px solid #e8e6e0',
                borderRadius: 12,
                padding: '20px 18px',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: p.accentColor + '15',
                  border: `1px solid ${p.accentColor}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  marginBottom: 12,
                  color: p.accentColor,
                  fontWeight: 700,
                }}
              >
                {p.icon}
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 4, fontFamily: 'Inter, sans-serif' }}>
                {p.title}
              </div>
              <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                {p.desc}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="px-8 pb-8 flex flex-col gap-3">
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '12px 0',
              background: '#C9343D',
              color: '#ffffff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              letterSpacing: '0.01em',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = '#a82830')}
            onMouseLeave={e => (e.currentTarget.style.background = '#C9343D')}
          >
            Comenzar →
          </button>
          <button
            onClick={onClose}
            style={{
              width: '100%',
              padding: '10px 0',
              background: 'transparent',
              color: '#888',
              border: 'none',
              borderRadius: 8,
              fontSize: 12,
              cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            Explorar por mi cuenta
          </button>
        </div>
      </div>
    </div>
  )
}
