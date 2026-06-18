import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toggleLanguage } from '@/i18n'
import { FormationDemo } from '@/components/ui/FormationDemo'
import { Modal } from '@/components/ui/Modal'
import { ARTICLES } from '@/data/articles'
import { supabase } from '@/features/auth/supabaseClient'

const FEATURES = [
  {
    icon: '⬡',
    title: '20+ Formaciones',
    desc: 'Línea, círculo, espiral, ola, bloques, X, flecha — con fichas pedagógicas detalladas.',
  },
  {
    icon: '◉',
    title: 'Niveles coreográficos',
    desc: 'Suelo, medio, de pie y aéreo. Opacidad y escala representan visualmente cada nivel.',
  },
  {
    icon: '▶',
    title: 'Preview de transición',
    desc: 'Animación fluida entre escenas con interpolación cúbica. Sin librerías externas.',
  },
  {
    icon: '🎵',
    title: 'Línea de audio',
    desc: 'Sincronizá cada escena con un marcador temporal en la pista de audio.',
  },
  {
    icon: '⊞',
    title: 'Multi-escena',
    desc: 'Creá hasta 100 escenas por proyecto. Duplicá, renombrá y reordenás en segundos.',
  },
  {
    icon: '◎',
    title: 'Estadísticas',
    desc: 'Mapa de zonas, distribución de niveles, densidad del escenario y paleta del grupo.',
  },
]

const STATS = [
  { value: '20+', label: 'Formaciones' },
  { value: '50', label: 'Bailarines/escena' },
  { value: '4', label: 'Niveles' },
  { value: '∞', label: 'Escenas' },
]

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '',
    desc: 'Para explorar',
    features: ['15 bailarines', '2 proyectos', 'Formaciones + preview', 'Link de solo lectura'],
    cta: 'Empezar gratis',
    highlight: false,
    action: 'navigate',
  },
  {
    name: 'Solo Pro',
    price: '$9.99',
    period: '/mes',
    desc: 'Para coreógrafos activos',
    features: ['50 bailarines', 'Proyectos ilimitados', 'Audio + timeline', 'Canon + estadísticas', 'PDF sin marca de agua'],
    cta: 'Empezar Solo Pro',
    highlight: true,
    action: 'navigate',
  },
  {
    name: 'Studio',
    price: '$24.99',
    period: '/mes',
    desc: 'Para academias',
    features: ['Bailarines ilimitados', 'Todo de Solo Pro', 'Estadísticas avanzadas', 'Hasta 5 usuarios', 'Soporte prioritario'],
    cta: 'Empezar Studio',
    highlight: false,
    action: 'navigate',
  },
]

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)
  const [demoDancers, setDemoDancers] = useState(12)
  const [demoColor, setDemoColor] = useState('#C9A961')

  // Waitlist state
  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!waitlistEmail.trim()) return
    setWaitlistStatus('loading')
    const { error } = await supabase.from('waitlist').insert({ email: waitlistEmail.trim() })
    if (error && error.code !== '23505') { // 23505 = unique violation (ya registrado)
      setWaitlistStatus('error')
    } else {
      setWaitlistStatus('success')
    }
  }

  return (
    <div className="min-h-screen bg-negro text-blanco-calido flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-borde/60 sticky top-0 z-50 bg-negro/95 backdrop-blur-sm">
        <div>
          <div className="text-dorado tracking-[0.2em] text-sm font-light">FORMACIONES</div>
          <div className="text-gris text-[9px] tracking-[0.15em]">PÓLEO LAB</div>
        </div>
        <div className="flex items-center gap-5">
          <button
            className="text-[10px] text-gris hover:text-dorado uppercase tracking-wider transition-colors"
            onClick={toggleLanguage}
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm text-gris hover:text-blanco-calido transition-colors"
          >
            {t('auth.sign_in')}
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="px-5 py-2 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium rounded-lg transition-colors"
          >
            Abrir app
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center max-w-6xl mx-auto px-8 py-24 gap-20 w-full">
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-dorado/30 bg-dorado/5 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-dorado animate-pulse" />
            <span className="text-dorado text-[10px] tracking-[0.2em] uppercase">Arquitectura coreográfica</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-light leading-[1.15] tracking-tight mb-6">
            Diseñá el escenario.<br />
            <span className="text-dorado">Antes de que empiece<br />la música.</span>
          </h1>
          <p className="text-gris text-lg leading-relaxed mb-10 max-w-md">
            La única herramienta de arquitectura coreográfica en español. Planificá, animá y compartí.
          </p>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => navigate('/projects')}
              className="px-8 py-3.5 bg-dorado hover:bg-dorado-oscuro text-negro font-medium rounded-xl
                         transition-all text-sm shadow-lg shadow-dorado/20 hover:shadow-dorado/30 hover:-translate-y-0.5"
            >
              Empezar gratis →
            </button>
            <button
              onClick={() => setShowDemo(true)}
              className="px-8 py-3.5 border border-borde hover:border-dorado/50 text-blanco-calido/80
                         hover:text-blanco-calido rounded-xl transition-colors text-sm"
            >
              Ver demo →
            </button>
          </div>
        </div>
        <div className="w-80 shrink-0 hidden md:block">
          <div className="relative">
            <div className="rounded-2xl border border-dorado/20 bg-[#0d0d0d] overflow-hidden shadow-2xl shadow-dorado/5">
              <FormationDemo width={320} height={220} dancerCount={12} color="#C9A961" />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-[#1c1c1c] border border-dorado/30 rounded-xl px-3 py-2 shadow-xl">
              <div className="text-dorado text-xs font-semibold">12 bailarines</div>
              <div className="text-gris text-[10px]">Demo en vivo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-borde/50 bg-[#111]/60">
        <div className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-light text-dorado tabular-nums">{s.value}</div>
              <div className="text-[10px] text-gris uppercase tracking-wider mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20 w-full">
        <div className="text-center mb-14">
          <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Herramientas</div>
          <h2 className="text-3xl font-light tracking-tight">Todo lo que necesitás para coreografiar</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div
              key={f.title}
              className="p-6 rounded-2xl border border-borde/60 bg-[#0f0f0f] hover:border-dorado/30 transition-all group hover:-translate-y-0.5"
            >
              <div className="text-2xl mb-4 text-dorado/70 group-hover:text-dorado transition-colors">{f.icon}</div>
              <h3 className="text-sm font-medium text-blanco-calido mb-2">{f.title}</h3>
              <p className="text-xs text-gris/70 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credencial */}
      <section className="border-y border-borde/50 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="w-20 h-20 rounded-full bg-dorado/10 border border-dorado/30 flex items-center justify-center shrink-0 text-2xl font-light text-dorado">
            DP
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Quién está detrás</div>
            <h2 className="text-xl font-light mb-3">
              Diego <span className="text-dorado">"Póleo"</span> Rossi
            </h2>
            <p className="text-gris/80 text-sm leading-relaxed max-w-xl">
              Juez internacional en competencias coreográficas y bailarín. Esta herramienta
              la construí porque no existía lo que yo necesitaba como juez: ver el espacio, los
              niveles y las transiciones antes del primer ensayo.
            </p>
            <a
              href="https://diegopoleo.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-[11px] text-dorado/60 hover:text-dorado transition-colors"
            >
              diegopoleo.com ↗
            </a>
          </div>
          <div className="hidden md:flex flex-col gap-3 shrink-0">
            {['Juez', 'Bailarín', 'Docente'].map(tag => (
              <span key={tag} className="px-3 py-1 text-[10px] border border-dorado/20 text-dorado/50 rounded-full tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="max-w-6xl mx-auto px-8 py-20 w-full">
        <div className="text-center mb-14">
          <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Planes</div>
          <h2 className="text-3xl font-light tracking-tight">Empezá gratis. Crecé cuando lo necesites.</h2>
          <p className="text-xs text-gris/50 mt-3">Stripe próximamente · Acceso anticipado gratuito mientras tanto</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all
                ${plan.highlight
                  ? 'border-dorado/50 bg-dorado/5 shadow-lg shadow-dorado/10'
                  : 'border-borde/60 bg-[#0f0f0f]'
                }`}
            >
              <div>
                {plan.highlight && (
                  <div className="text-[9px] text-dorado uppercase tracking-[0.3em] mb-2">Más popular</div>
                )}
                <div className="text-base font-medium">{plan.name}</div>
                <div className="text-[11px] text-gris/50 mb-2">{plan.desc}</div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-light text-dorado">{plan.price}</span>
                  <span className="text-gris text-xs">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-blanco-calido/70">
                    <span className="text-dorado/60 shrink-0">·</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => navigate('/projects')}
                className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors
                  ${plan.highlight
                    ? 'bg-dorado hover:bg-dorado-oscuro text-negro'
                    : 'border border-dorado/30 text-dorado/70 hover:border-dorado/60 hover:text-dorado'
                  }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Artículos pedagógicos */}
      <section className="border-t border-borde/50 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto px-8 py-16 w-full">
          <div className="text-center mb-10">
            <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-3">Pedagogía</div>
            <h2 className="text-2xl font-light tracking-tight">Aprendé composición coreográfica</h2>
            <p className="text-xs text-gris/50 mt-2">Artículos de Diego Póleo para profundizar en cada herramienta</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ARTICLES.map(a => (
              <a
                key={a.titleKey}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-xl border border-borde/60 bg-[#111] hover:border-dorado/40 transition-all group hover:-translate-y-0.5 flex flex-col gap-3"
              >
                <div className="text-dorado/40 text-lg">📖</div>
                <p className="text-xs text-blanco-calido/80 group-hover:text-blanco-calido transition-colors leading-snug flex-1">
                  {t(a.titleKey)}
                </p>
                <span className="text-[10px] text-dorado/50 group-hover:text-dorado transition-colors">
                  diegopoleo.com ↗
                </span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-t border-borde/50 bg-[#080808]">
        <div className="max-w-xl mx-auto px-8 py-20 text-center">
          <div className="text-[10px] text-dorado/60 uppercase tracking-[0.3em] mb-4">Acceso anticipado</div>
          <h2 className="text-3xl font-light tracking-tight mb-3">Sé de los primeros 100</h2>
          <p className="text-gris text-sm mb-8 leading-relaxed">
            Los primeros 100 usuarios tienen acceso fundador: plan Solo Pro gratis de por vida, sin límite de tiempo.
          </p>

          {waitlistStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center text-green-400 text-xl">
                ✓
              </div>
              <p className="text-green-400 text-sm">¡Anotado! Te avisamos cuando abramos.</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2 max-w-sm mx-auto">
              <input
                type="email"
                required
                value={waitlistEmail}
                onChange={e => setWaitlistEmail(e.target.value)}
                placeholder="tu@email.com"
                className="flex-1 bg-negro border border-borde rounded-xl px-4 py-3 text-sm text-blanco-calido
                           placeholder:text-gris/40 focus:outline-none focus:border-dorado/60 transition-colors"
              />
              <button
                type="submit"
                disabled={waitlistStatus === 'loading'}
                className="px-5 py-3 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium rounded-xl
                           transition-colors disabled:opacity-60 shrink-0"
              >
                {waitlistStatus === 'loading' ? '...' : 'Anotarme'}
              </button>
            </form>
          )}

          {waitlistStatus === 'error' && (
            <p className="text-red-400 text-xs mt-3">Hubo un error. Intentá de nuevo.</p>
          )}

          <p className="text-gris/30 text-[10px] mt-5">Sin spam. Solo el aviso de apertura.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-5 border-t border-borde/40 flex justify-between items-center text-[10px] text-gris/50">
        <span>© 2026 Diego "Póleo" Rossi — diegopoleo.com</span>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          MVP v1.0
        </span>
      </footer>

      {/* Modal demo */}
      <Modal open={showDemo} onClose={() => setShowDemo(false)} title="Demo en vivo" className="max-w-2xl">
        <div className="space-y-5">
          <div className="rounded-xl overflow-hidden border border-dorado/20 bg-[#0a0a0a] flex items-center justify-center">
            <FormationDemo width={560} height={340} dancerCount={demoDancers} color={demoColor} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-2">
                Bailarines: {demoDancers}
              </label>
              <input
                type="range" min={7} max={20} value={demoDancers}
                onChange={e => setDemoDancers(Number(e.target.value))}
                className="w-full accent-[#C9A961]"
              />
            </div>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-2">Color</label>
              <input
                type="color" value={demoColor}
                onChange={e => setDemoColor(e.target.value)}
                className="h-8 w-full rounded cursor-pointer bg-transparent border border-borde"
              />
            </div>
          </div>
          <button
            onClick={() => { setShowDemo(false); navigate('/projects') }}
            className="w-full py-3 bg-dorado hover:bg-dorado-oscuro text-negro font-medium rounded-lg transition-colors text-sm"
          >
            Empezar gratis →
          </button>
        </div>
      </Modal>

    </div>
  )
}
