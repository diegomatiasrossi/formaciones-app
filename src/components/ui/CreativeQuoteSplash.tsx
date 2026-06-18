import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { QUOTES } from '@/data/quotes'

const LAST_INDEX_KEY = 'formaciones_last_quote_index'
const DISPLAY_MS = 2000

function pickQuote() {
  const last = parseInt(localStorage.getItem(LAST_INDEX_KEY) ?? '-1', 10)
  let next = Math.floor(Math.random() * QUOTES.length)
  if (QUOTES.length > 1 && next === last) next = (next + 1) % QUOTES.length
  localStorage.setItem(LAST_INDEX_KEY, String(next))
  return QUOTES[next]
}

interface Props {
  onDone: () => void
}

export function CreativeQuoteSplash({ onDone }: Props) {
  const { i18n } = useTranslation()
  const lang = i18n.language.startsWith('en') ? 'en' : 'es'
  const quote = useRef(pickQuote())

  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('hold'), 400)
    const t2 = setTimeout(() => setPhase('out'), DISPLAY_MS)
    const t3 = setTimeout(onDone, DISPLAY_MS + 400)
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3) }
  }, [onDone])

  const opacity =
    phase === 'in'  ? 'opacity-0 translate-y-2' :
    phase === 'hold' ? 'opacity-100 translate-y-0' :
                       'opacity-0 -translate-y-2'

  return (
    <div className="fixed inset-0 z-50 bg-negro flex flex-col items-center justify-center px-8 select-none">
      <div className={`flex flex-col items-center text-center max-w-lg transition-all duration-500 ${opacity}`}>
        <div className="text-dorado/30 text-5xl mb-6 font-serif leading-none">"</div>
        <p className="text-blanco-calido text-xl font-light leading-relaxed tracking-wide mb-4">
          {quote.current[lang]}
        </p>
        {quote.current.author && (
          <p className="text-dorado text-xs uppercase tracking-widest">
            — {quote.current.author}
          </p>
        )}
      </div>

      <button
        onClick={onDone}
        className="absolute bottom-8 right-8 text-xs text-gris/40 hover:text-dorado transition-colors tracking-wider"
      >
        Continuar →
      </button>
    </div>
  )
}
