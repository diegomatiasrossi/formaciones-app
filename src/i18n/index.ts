import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es'
import en from './en'
import pt from './pt'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
      pt: { translation: pt },
    },
    lng: localStorage.getItem('lang') ?? 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export { i18n }

const LANGS = ['es', 'en', 'pt'] as const
export type Lang = typeof LANGS[number]

export function toggleLanguage() {
  const idx = LANGS.indexOf(i18n.language as Lang)
  const next = LANGS[(idx + 1) % LANGS.length]
  i18n.changeLanguage(next)
  localStorage.setItem('lang', next)
}

export function getLangLabel(lang: string) {
  return { es: 'ES', en: 'EN', pt: 'PT' }[lang] ?? 'ES'
}
