import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './es'
import en from './en'

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    lng: localStorage.getItem('lang') ?? 'es',
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
  })

export { i18n }

export function toggleLanguage() {
  const next = i18n.language === 'es' ? 'en' : 'es'
  i18n.changeLanguage(next)
  localStorage.setItem('lang', next)
}
