import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toggleLanguage, getLangLabel } from '@/i18n'
import { FormationDemo } from '@/components/ui/FormationDemo'
import { Modal } from '@/components/ui/Modal'
import { Logo } from '@/components/ui/Logo'
import { ARTICLES } from '@/data/articles'
import { supabase } from '@/features/auth/supabaseClient'

const FEATURES = [
  { icon: '⬡', title: '20+ Formaciones', desc: 'Línea, círculo, espiral, ola, bloques, X, flecha — con fichas pedagógicas detalladas.' },
  { icon: '◉', title: 'Niveles coreográficos', desc: 'Suelo, medio, de pie y aéreo. Opacidad y escala representan visualmente cada nivel.' },
  { icon: '▶', title: 'Preview de transición', desc: 'Animación fluida entre escenas con interpolación cúbica. Sin librerías externas.' },
  { icon: '🎵', title: 'Línea de audio', desc: 'Sincronizá cada escena con un marcador temporal en la pista de audio.' },
  { icon: '⊞', title: 'Multi-escena', desc: 'Creá hasta 100 escenas por proyecto. Duplicá, renombrá y reordenás en segundos.' },
  { icon: '◎', title: 'Estadísticas', desc: 'Mapa de zonas, distribución de niveles, densidad del escenario y paleta del grupo.' },
]

const STATS = [
  { value: '20+', labelKey: 'landing.stats_formations' },
  { value: '50',  labelKey: 'landing.stats_members' },
  { value: '4',   labelKey: 'landing.stats_levels' },
  { value: '∞',   labelKey: 'landing.stats_scenes' },
]

const PLANS = [
  { name: 'Free', price: '$0', period: '', desc: 'Para explorar', features: ['15 integrantes', '2 proyectos', 'Formaciones + preview', 'Link de solo lectura'], cta: 'Empezar gratis', highlight: false },
  { name: 'Solo Pro', price: '$9.99', period: '/mes', desc: 'Para coreógrafos activos', features: ['50 integrantes', 'Proyectos ilimitados', 'Audio + timeline', 'Canon + PDF', '14 días gratis'], cta: 'Empezar Solo Pro', highlight: true },
  { name: 'Studio', price: '$24.99', period: '/mes', desc: 'Para academias', features: ['Integrantes ilimitados', 'Todo de Solo Pro', 'Estadísticas avanzadas', 'Hasta 5 usuarios', 'Soporte prioritario'], cta: 'Empezar Studio', highlight: false },
]

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)
  const [demoDancers, setDemoDancers] = useState(7)
  const [demoColor, setDemoColor] = useState('#C9A961')

  const [waitlistEmail, setWaitlistEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!waitlistEmail.trim()) return
    setWaitlistStatus('loading')
    const { error } = await supabase.from('waitlist').insert({ email: waitlistEmail.trim() })
    if (error && error.code !== '23505') setWaitlistStatus('error')
    else setWaitlistStatus('success')
  }

  return (
    <div className="min-h-screen bg-crema text-negro flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-borde-light sticky top-0 z-50 bg-crema/95 backdrop-blur-sm">
        <Logo size={30} />
        <div className="flex items-center gap-5">
          <button className="text-[10px] text-gris hover:text-negro uppercase tracking-wider transition-colors" onClick={toggleLanguage}>
            {getLangLabel(i18n.language)}
          </button>
          <button onClick={() => navigate('/login')} className="text-sm text-gris hover:text-negro transition-colors">
            {t('auth.sign_in')}
          </button>
          <button onClick={() => navigate('/projects')} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">
            Abrir app
          </button>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex items-center max-w-6xl mx-auto px-8 py-24 gap-20 w-full">
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.1] tracking-tight mb-4">
            {t('landing.headline')}
          </h1>
          <p className="text-xl font-light text-negro/70 mb-4 max-w-lg">
            {t('landing.subheadline')}
          </p>
          <p className="text-gris text-base leading-relaxed mb-10 max-w-md">
            {t('landing.body')}
          </p>
          <div className="flex gap-4 flex-wrap">
            <button onClick={() => navigate('/projects')} className="px-8 py-3.5 bg-negro hover:bg-negro/90 text-crema font-semibold rounded-xl transition-all text-sm shadow-card hover:-translate-y-0.5">
              {t('landing.cta')} →
            </button>
            <button onClick={() => setShowDemo(true)} className="px-8 py-3.5 border border-borde-light hover:border-dorado text-negro/80 hover:text-negro rounded-xl transition-colors text-sm bg-blanco">
              {t('landing.cta_demo')} →
            </button>
          </div>
        </div>
        <div className="w-80 shrink-0 hidden md:block">
          <div className="relative">
            <div className="rounded-2xl border border-borde-light bg-negro overflow-hidden shadow-card">
              <FormationDemo width={320} height={220} dancerCount={7} color="#C9A961" />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-blanco border border-borde-light rounded-xl px-3 py-2 shadow-card">
              <div className="text-dorado text-xs font-semibold">7 integrantes</div>
              <div className="text-gris text-[10px]">Demo en vivo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-y border-borde-light bg-blanco">
        <div className="max-w-6xl mx-auto px-8 py-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(s => (
            <div key={s.labelKey} className="text-center">
              <div className="text-2xl font-semibold text-negro tabular-nums">{s.value}</div>
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <div className="text-[10px] text-gris uppercase tracking-wider mt-1">{t(s.labelKey as any)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-8 py-20 w-full">
        <div className="text-center mb-14">
          <div className="text-[10px] text-rojo uppercase tracking-[0.3em] mb-3 font-semibold">Herramientas</div>
          <h2 className="text-3xl font-semibold tracking-tight">Todo lo que necesitás para coreografiar</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="p-6 rounded-2xl border border-borde-light bg-blanco hover:border-dorado/50 hover:shadow-soft transition-all group hover:-translate-y-0.5">
              <div className="text-2xl mb-4 text-dorado">{f.icon}</div>
              <h3 className="text-sm font-semibold text-negro mb-2">{f.title}</h3>
              <p className="text-xs text-gris leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Credencial */}
      <section className="border-y border-borde-light bg-blanco">
        <div className="max-w-4xl mx-auto px-8 py-16 flex flex-col md:flex-row items-center gap-10">
          <div className="w-20 h-20 rounded-full bg-rojo/10 border border-rojo/30 flex items-center justify-center shrink-0 text-2xl font-semibold text-rojo">
            DP
          </div>
          <div className="flex-1 text-center md:text-left">
            <div className="text-[10px] text-rojo uppercase tracking-[0.3em] mb-3 font-semibold">Quién está detrás</div>
            <h2 className="text-xl font-semibold mb-3">
              Diego <span className="text-dorado-oscuro">"Póleo"</span> Rossi
            </h2>
            <p className="text-gris text-sm leading-relaxed max-w-xl">
              {t('landing.who_text')}
            </p>
            <a href="https://diegopoleo.com" target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-[11px] text-dorado-oscuro hover:text-dorado transition-colors">
              diegopoleo.com ↗
            </a>
          </div>
          <div className="hidden md:flex flex-col gap-3 shrink-0">
            {['Juez', 'Bailarín', 'Docente'].map(tag => (
              <span key={tag} className="px-3 py-1 text-[10px] border border-dorado/30 text-dorado-oscuro rounded-full tracking-wider text-center">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Precios */}
      <section className="max-w-6xl mx-auto px-8 py-20 w-full">
        <div className="text-center mb-14">
          <div className="text-[10px] text-rojo uppercase tracking-[0.3em] mb-3 font-semibold">Planes</div>
          <h2 className="text-3xl font-semibold tracking-tight">Empezá gratis. Crecé cuando lo necesites.</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLANS.map(plan => (
            <div key={plan.name} className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all bg-blanco
              ${plan.highlight ? 'border-2 border-rojo shadow-card' : 'border-borde-light shadow-soft'}`}>
              <div>
                {plan.highlight && <div className="text-[9px] text-rojo uppercase tracking-[0.3em] mb-2 font-bold">Más popular</div>}
                <div className="text-base font-semibold">{plan.name}</div>
                <div className="text-[11px] text-gris mb-2">{plan.desc}</div>
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-3xl font-semibold ${plan.highlight ? 'text-rojo' : 'text-negro'}`}>{plan.price}</span>
                  <span className="text-gris text-xs">{plan.period}</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs text-negro/75">
                    <span className="text-green-600 shrink-0">✓</span>{f}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/pricing')} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
                ${plan.highlight ? 'bg-rojo hover:bg-rojo-oscuro text-blanco' : 'border border-borde-light text-negro hover:border-dorado'}`}>
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Artículos */}
      <section className="border-t border-borde-light bg-blanco">
        <div className="max-w-6xl mx-auto px-8 py-16 w-full">
          <div className="text-center mb-10">
            <div className="text-[10px] text-rojo uppercase tracking-[0.3em] mb-3 font-semibold">Pedagogía</div>
            <h2 className="text-2xl font-semibold tracking-tight">Aprendé composición coreográfica</h2>
            <p className="text-xs text-gris mt-2">Artículos de Diego Póleo para profundizar en cada herramienta</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ARTICLES.map(a => (
              <a key={a.titleKey} href={a.url} target="_blank" rel="noopener noreferrer"
                className="p-5 rounded-xl border border-borde-light bg-crema hover:border-dorado/50 hover:shadow-soft transition-all group hover:-translate-y-0.5 flex flex-col gap-3">
                <div className="text-dorado text-lg">📖</div>
                <p className="text-xs text-negro/80 group-hover:text-negro transition-colors leading-snug flex-1">{t(a.titleKey)}</p>
                <span className="text-[10px] text-dorado-oscuro transition-colors">diegopoleo.com ↗</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section className="border-t border-borde-light bg-negro">
        <div className="max-w-xl mx-auto px-8 py-20 text-center">
          <div className="text-[10px] text-dorado uppercase tracking-[0.3em] mb-4 font-semibold">Acceso anticipado</div>
          <h2 className="text-3xl font-semibold tracking-tight mb-3 text-crema">{t('landing.waitlist_headline')}</h2>
          <p className="text-gris text-sm mb-8 leading-relaxed">{t('landing.waitlist_body')}</p>

          {waitlistStatus === 'success' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center text-green-400 text-xl">✓</div>
              <p className="text-green-400 text-sm">{t('landing.waitlist_success')}</p>
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex gap-2 max-w-sm mx-auto">
              <input type="email" required value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)} placeholder={t('landing.waitlist_placeholder')}
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm text-crema placeholder:text-gris focus:outline-none focus:border-dorado transition-colors" />
              <button type="submit" disabled={waitlistStatus === 'loading'}
                className="px-5 py-3 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-semibold rounded-xl transition-colors disabled:opacity-60 shrink-0">
                {waitlistStatus === 'loading' ? '...' : t('landing.waitlist_cta')}
              </button>
            </form>
          )}
          {waitlistStatus === 'error' && <p className="text-rojo text-xs mt-3">Hubo un error. Intentá de nuevo.</p>}
          <p className="text-gris/60 text-[10px] mt-5">{t('landing.waitlist_no_spam')}</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-borde-light bg-crema">
        <div className="max-w-6xl mx-auto px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <Logo size={24} />
          <nav className="flex items-center gap-6 text-xs text-gris flex-wrap justify-center">
            <button onClick={() => navigate('/')} className="hover:text-negro transition-colors">Inicio</button>
            <button onClick={() => navigate('/pricing')} className="hover:text-negro transition-colors">Precios</button>
            <a href="mailto:hola@crewficina.com" className="hover:text-negro transition-colors">hola@crewficina.com</a>
            <button onClick={() => navigate('/privacidad')} className="hover:text-negro transition-colors">Privacidad</button>
          </nav>
          <div className="flex items-center gap-3 text-[10px] text-gris/60">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              En vivo
            </span>
            <span>© 2026 Crewficina</span>
          </div>
        </div>
      </footer>

      {/* Modal demo */}
      <Modal open={showDemo} onClose={() => setShowDemo(false)} title="Demo en vivo" className="max-w-2xl">
        <div className="space-y-5">
          <div className="rounded-xl overflow-hidden border border-borde-light bg-negro flex items-center justify-center">
            <FormationDemo width={560} height={340} dancerCount={demoDancers} color={demoColor} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-2">Integrantes: {demoDancers}</label>
              <input type="range" min={7} max={20} value={demoDancers} onChange={e => setDemoDancers(Number(e.target.value))} className="w-full accent-[#C9343D]" />
            </div>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-2">Color</label>
              <input type="color" value={demoColor} onChange={e => setDemoColor(e.target.value)} className="h-8 w-full rounded cursor-pointer bg-transparent border border-borde-light" />
            </div>
          </div>
          <button onClick={() => { setShowDemo(false); navigate('/projects') }} className="w-full py-3 bg-rojo hover:bg-rojo-oscuro text-blanco font-semibold rounded-lg transition-colors text-sm">
            Empezar gratis →
          </button>
        </div>
      </Modal>

    </div>
  )
}
