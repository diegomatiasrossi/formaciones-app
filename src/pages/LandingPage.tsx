import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toggleLanguage, getLangLabel } from '@/i18n'
import { FormationDemo } from '@/components/ui/FormationDemo'
import { useIsMobile } from '@/hooks/useIsMobile'
import { Modal } from '@/components/ui/Modal'
import { Logo } from '@/components/ui/Logo'
import { PRICING_PLANS } from '@/data/pricingPlans'
import poleoLogo from '@/assets/diego-poleo-logo.png'

const FEATURES = [
  { icon: '⬡', title: '20+ Formaciones', desc: 'Línea, círculo, espiral, ola, bloques, X, flecha y más.' },
  { icon: '◉', title: 'Niveles coreográficos', desc: 'Suelo, medio, de pie y aéreo. Opacidad y escala representan visualmente cada nivel.' },
  { icon: '▶', title: 'Preview de transición', desc: 'Transiciones suaves entre escenas, en tiempo real.' },
  { icon: '♪', title: 'Línea de audio', desc: 'Sincronizá cada escena con un marcador temporal en la pista de audio.' },
  { icon: '⊞', title: 'Multi-escena', desc: 'Creá hasta 100 escenas por proyecto. Duplicá, renombrá y reordenás en segundos.' },
  { icon: '◎', title: 'Estadísticas', desc: 'Mapa de zonas, distribución de niveles, densidad del escenario y colores por grupo.' },
]

const STATS = [
  { value: '20+', labelKey: 'landing.stats_formations' },
  { value: '50',  labelKey: 'landing.stats_members' },
  { value: '4',   labelKey: 'landing.stats_levels' },
  { value: '∞',   labelKey: 'landing.stats_scenes' },
]

export function LandingPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [showDemo, setShowDemo] = useState(false)
  const [demoDancers, setDemoDancers] = useState(7)
  const [demoColor, setDemoColor] = useState('#C9A961')
  const isMobile = useIsMobile()
  // Canvas de FormationDemo: Konva necesita px fijos, no puede ser responsive por CSS.
  // 375px viewport − 64px padding (px-8 × 2) = 311px disponibles → 280px cabe con holgura.
  const demoW = isMobile ? 280 : 384
  const demoH = isMobile ? 190 : 260

  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterSent, setNewsletterSent] = useState(false)
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  function handleNewsletter(e: React.FormEvent) {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterSent(true)
  }

  return (
    <div className="min-h-screen bg-crema text-negro flex flex-col">

      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-borde-light sticky top-0 z-50 bg-crema/95 backdrop-blur-sm">
        <Logo size={30} />
        <div className="flex items-center gap-5">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gris hover:text-negro border border-borde-light hover:border-gris rounded-full uppercase tracking-wider transition-colors bg-blanco/60"
            onClick={toggleLanguage}
          >
            <span aria-hidden="true">🌐</span> {getLangLabel(i18n.language)}
          </button>
          <button onClick={() => navigate('/login')} className="text-sm text-gris hover:text-negro transition-colors">
            {t('auth.sign_in')}
          </button>
          <button onClick={() => navigate('/projects')} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">
            {t('landing.open_app')}
          </button>
        </div>
      </nav>

      {/* Hero
           Mobile (flex-col, <768px):  headline → body → [animación] → [botones]
           Desktop (flex-row, ≥768px): [texto + botones] ←→ [animación]
           Los botones se duplican en JSX (desktop: dentro del div de texto;
           mobile: elemento independiente) para evitar hacks de order en
           flex anidado. */}
      <section className="flex-1 flex flex-col md:flex-row items-center max-w-6xl mx-auto px-8 py-16 md:py-24 gap-10 md:gap-20 w-full">

        {/* Columna de texto — en mobile solo lleva headline y body */}
        <div className="flex-1 min-w-0">
          <h1 className="text-5xl md:text-6xl font-semibold leading-[1.1] tracking-tight mb-4">
            {t('landing.headline')}
          </h1>
          <p className="text-gris text-base leading-relaxed mb-10 max-w-md">
            {t('landing.body')}
          </p>
          {/* Botones en desktop — ocultos en mobile (van debajo de la animación) */}
          <div className="hidden md:flex gap-4 flex-wrap">
            <button onClick={() => navigate('/projects')} className="px-8 py-3.5 bg-rojo hover:bg-rojo-oscuro text-blanco font-semibold rounded-xl transition-all text-sm shadow-card hover:-translate-y-0.5">
              {t('landing.cta')} →
            </button>
            <button onClick={() => setShowDemo(true)} className="px-8 py-3.5 border border-borde-light hover:border-dorado text-negro/80 hover:text-negro rounded-xl transition-colors text-sm bg-blanco">
              {t('landing.cta_demo')} →
            </button>
          </div>
        </div>

        {/* Animación — columna derecha en desktop, entre texto y botones en mobile */}
        <div className="shrink-0 self-center">
          <div className="relative">
            <div className="rounded-2xl border border-borde-light bg-negro overflow-hidden shadow-card">
              <FormationDemo width={demoW} height={demoH} dancerCount={7} color="#C9A961" />
            </div>
            <div className="absolute -bottom-3 -right-3 bg-blanco border border-borde-light rounded-xl px-3 py-2 shadow-card">
              <div className="text-dorado text-xs font-semibold">7 integrantes</div>
              <div className="text-gris text-[10px]">Demo en vivo</div>
            </div>
          </div>
        </div>

        {/* Botones en mobile — debajo de la animación (ocultos en desktop).
            mt-4 extra para respirar del badge -bottom-3 de la animación. */}
        <div className="flex md:hidden gap-4 flex-wrap mt-4">
          <button onClick={() => navigate('/projects')} className="px-8 py-3.5 bg-rojo hover:bg-rojo-oscuro text-blanco font-semibold rounded-xl transition-all text-sm shadow-card hover:-translate-y-0.5">
            {t('landing.cta')} →
          </button>
          <button onClick={() => setShowDemo(true)} className="px-8 py-3.5 border border-borde-light hover:border-dorado text-negro/80 hover:text-negro rounded-xl transition-colors text-sm bg-blanco">
            {t('landing.cta_demo')} →
          </button>
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
          <img
            src={poleoLogo}
            alt="Diego Póleo"
            className="h-16 w-auto shrink-0"
          />
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
          {PRICING_PLANS.map(plan => (
            <div key={plan.id} className={`rounded-2xl border p-6 flex flex-col gap-5 transition-all bg-blanco
              ${plan.highlight ? 'border-2 border-rojo shadow-card' : 'border-borde-light shadow-soft'}`}>
              <div>
                {plan.highlight && <div className="text-[9px] text-rojo uppercase tracking-[0.3em] mb-2 font-bold">{t('pricing.most_popular')}</div>}
                <div className="text-base font-semibold">{plan.name}</div>
                <div className="text-[11px] text-gris mb-2">{t(plan.descKey)}</div>
                <div className="flex items-baseline gap-0.5">
                  <span className={`text-3xl font-semibold ${plan.highlight ? 'text-rojo' : 'text-negro'}`}>{plan.price}</span>
                  <span className="text-gris text-xs">{plan.periodKey ? t(plan.periodKey) : ''}</span>
                </div>
              </div>
              <ul className="space-y-2 flex-1">
                {plan.features.filter(f => f.available).map(f => (
                  <li key={f.key} className="flex items-center gap-2 text-xs text-negro/75">
                    <span className="text-green-600 shrink-0">✓</span>{t(f.key)}
                  </li>
                ))}
              </ul>
              <button onClick={() => navigate('/pricing')} className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors
                ${plan.highlight ? 'bg-rojo hover:bg-rojo-oscuro text-blanco' : 'border border-borde-light text-negro hover:border-dorado'}`}>
                {t(plan.ctaKey)}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Newsletter */}
      <section className="border-t border-borde-light bg-negro">
        <div className="max-w-xl mx-auto px-8 py-20 text-center">
          <div className="text-[10px] text-dorado uppercase tracking-[0.3em] mb-4 font-semibold">Newsletter</div>
          <h2 className="text-3xl font-semibold tracking-tight mb-3 text-crema">{t('landing.waitlist_headline')}</h2>
          <p className="text-gris text-sm mb-8 leading-relaxed">{t('landing.waitlist_body')}</p>

          {newsletterSent ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/15 border border-green-500/40 flex items-center justify-center text-green-400 text-xl">✓</div>
              <p className="text-green-400 text-sm">{t('landing.waitlist_success')}</p>
            </div>
          ) : (
            <form onSubmit={handleNewsletter} className="flex gap-2 max-w-sm mx-auto">
              <input type="email" required value={newsletterEmail} onChange={e => setNewsletterEmail(e.target.value)} placeholder={t('landing.waitlist_placeholder')}
                className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-xl px-4 py-3 text-sm text-crema placeholder:text-gris focus:outline-none focus:border-dorado transition-colors" />
              <button type="submit"
                className="px-5 py-3 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-xl transition-colors shrink-0">
                {t('landing.waitlist_cta')}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-borde-light bg-crema">
        <div className="max-w-2xl mx-auto px-8 py-20">
          <h2 className="text-3xl font-semibold tracking-tight mb-8 text-negro text-center">
            {t('faq.title')}
          </h2>
          <div className="space-y-2">
            {[0, 1, 2, 3, 4, 5].map(i => {
              const isOpen = openFaq === i
              return (
                <div key={i} className="border border-borde-light rounded-xl bg-blanco overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-medium text-negro">{t(`faq.q${i + 1}`)}</span>
                    <span className={`text-gris shrink-0 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                  </button>
                  {isOpen && (
                    <p className="px-5 pb-4 text-sm text-gris leading-relaxed">{t(`faq.a${i + 1}`)}</p>
                  )}
                </div>
              )
            })}
          </div>
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
            <button onClick={() => navigate('/terminos')} className="hover:text-negro transition-colors">Términos</button>
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
