// Utilidad centralizada para GA4 (Measurement ID: G-2HC5QF17MS).
// El stub de dataLayer/gtag vive en index.html (prepara la cola sin transmitir).
// loadGA4() carga el script real solo cuando localStorage[COOKIE_CONSENT_KEY] === 'all'.
// trackGA4Event() chequea ga4Loaded ANTES de enqueue — garantiza que eventos
// disparados sin consentimiento no queden encolados para enviarse después.
// Mismo patrón que metaPixel.ts.

import { COOKIE_CONSENT_KEY } from '@/components/ui/CookieBanner'

const MEASUREMENT_ID = 'G-2HC5QF17MS'

// Declaración mínima de window.gtag y dataLayer — sin @types de terceros.
declare global {
  interface Window {
    dataLayer: unknown[]
    gtag: (...args: unknown[]) => void
  }
}

let ga4Loaded = false

/** Carga el script real de gtag solo con consentimiento 'all'. Idempotente. */
export function loadGA4(): void {
  if (ga4Loaded) return
  try {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) !== 'all') return
  } catch { return }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`
  script.onload = () => {
    // Inicializar y configurar GA4 en cuanto el script esté disponible.
    // send_page_view: false — los page_view los disparamos manualmente en
    // App.tsx para que respeten el router de React (SPA).
    window.gtag('js', new Date())
    window.gtag('config', MEASUREMENT_ID, { send_page_view: false })
    ga4Loaded = true
    // Avisar a App.tsx que el script terminó de cargar para que dispare el
    // page_view de la primera ruta. Sin esto se pierde por race condition:
    // el useEffect de pathname ya corrió antes de que el script cargara.
    window.dispatchEvent(new Event('ga4-ready'))
  }
  document.head.appendChild(script)
}

/** Dispara un evento GA4.
 *  CRÍTICO: el guard ga4Loaded garantiza que eventos emitidos antes de
 *  aceptar cookies no queden en la cola de dataLayer para enviarse después.
 *  Si el script no cargó, la llamada es un no-op silencioso. */
export function trackGA4Event(name: string, params?: Record<string, unknown>): void {
  if (!ga4Loaded) return
  try {
    if (params) {
      window.gtag('event', name, params)
    } else {
      window.gtag('event', name)
    }
  } catch { /* nunca crashear el flujo por un evento de analytics */ }
}

/** Carga GA4 si ya hay consentimiento y escucha 'cookie-consent-changed'
 *  para activarlo al vuelo. Llamar una sola vez al montar la app (main.tsx). */
export function initGA4Listener(): () => void {
  loadGA4()
  function handler() { loadGA4() }
  window.addEventListener('cookie-consent-changed', handler)
  return () => window.removeEventListener('cookie-consent-changed', handler)
}
