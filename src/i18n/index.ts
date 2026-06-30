import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es'
import en from './en'
import pt from './pt'

// Detecta el idioma del browser cuando el usuario todavía no eligió uno
// manualmente (sin valor guardado en localStorage). Solo navigator.language —
// sin APIs externas ni geolocalización. pt-* → pt, es-* → es, cualquier otro → en.
function detectBrowserLang(): 'es' | 'en' | 'pt' {
  const raw = (navigator.language || 'en').toLowerCase()
  if (raw.startsWith('pt')) return 'pt'
  if (raw.startsWith('es')) return 'es'
  return 'en'
}

const storedLang = localStorage.getItem('lang')
const initialLang = storedLang ?? detectBrowserLang()
// Persistimos la detección inicial para que quede como preferencia explícita
// desde la primera visita (no solo en el cambio manual del toggle).
if (!storedLang) localStorage.setItem('lang', initialLang)

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: initialLang,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export { i18n }

const LANGS = ['es', 'en', 'pt'] as const
export type Lang = typeof LANGS[number]

// Debounce por timestamp (no puede quedar trabado como un boolean). El primer
// click siempre pasa; solo se ignoran clicks repetidos dentro de 250ms.
let lastToggle = 0
export function toggleLanguage() {
  const now = Date.now()
  if (now - lastToggle < 250) return
  lastToggle = now
  // Normalizar: i18n.language puede venir como 'es-AR' / 'en-US' según el entorno,
  // lo que rompía indexOf y dejaba el cambio sin aplicarse.
  const base = (i18n.language || 'es').slice(0, 2) as Lang
  const idx = LANGS.indexOf(base)
  const next = LANGS[(idx < 0 ? 0 : idx + 1) % LANGS.length]
  void i18n.changeLanguage(next)
  localStorage.setItem('lang', next)
}

export function getLangLabel(lang: string) {
  return { es: 'ES', en: 'EN', pt: 'PT' }[lang] ?? 'ES'
}
