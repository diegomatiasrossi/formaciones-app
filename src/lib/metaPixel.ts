// Utilidad centralizada para Meta Pixel (Crewficina Pixel — ID 1738555567593579).
// El script de fbq se inicializa como stub en index.html (sin cargar
// connect.facebook.net) para que la cola exista desde el principio.
// loadPixel() carga el script real solo cuando el usuario acepta todas las
// cookies; trackEvent() es la única función de disparo que el resto del código
// debe usar — nunca llamar window.fbq directamente.

import { COOKIE_CONSENT_KEY } from '@/components/ui/CookieBanner'

// Declaración mínima de window.fbq — sin instalar @types de terceros.
declare global {
  interface Window {
    fbq: (...args: unknown[]) => void
  }
}

const PIXEL_ID = '1738555567593579'
let pixelLoaded = false

/** Carga el script externo de fbevents.js e inicializa el Pixel.
 *  Solo se ejecuta cuando localStorage[COOKIE_CONSENT_KEY] === 'all'.
 *  Idempotente: llamadas repetidas son ignoradas. */
export function loadPixel(): void {
  if (pixelLoaded) return
  try {
    if (localStorage.getItem(COOKIE_CONSENT_KEY) !== 'all') return
  } catch { return }

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  // Disparar PageView en cuanto fbevents.js termina de cargar y redefine
  // window.fbq con la función real (antes de onload, fbq es solo la cola stub).
  script.onload = () => trackEvent('PageView')
  document.head.appendChild(script)

  // noscript fallback (para entornos sin JS — buena práctica aunque Vite
  // es SPA y rara vez se ejecuta, pero cumple con las instrucciones de Meta).
  const ns = document.createElement('noscript')
  const img = document.createElement('img')
  img.height = 1
  img.width = 1
  img.style.display = 'none'
  img.src = `https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`
  ns.appendChild(img)
  document.head.appendChild(ns)

  pixelLoaded = true
}

/** Dispara un evento estándar o custom de Meta Pixel.
 *  Si fbq aún no está disponible (cookies no aceptadas o script no cargado),
 *  la llamada es ignorada silenciosamente. */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  try {
    if (typeof window.fbq !== 'function') return
    if (params) {
      window.fbq('track', eventName, params)
    } else {
      window.fbq('track', eventName)
    }
  } catch { /* nunca crashear el flujo por un evento de tracking */ }
}

/** Inicializa el Pixel si ya hay consentimiento, y escucha el evento
 *  'cookie-consent-changed' para activarlo cuando el usuario acepta cookies.
 *  Llamar una sola vez al montar la app (en main.tsx). */
export function initPixelListener(): () => void {
  loadPixel()
  function handler() { loadPixel() }
  window.addEventListener('cookie-consent-changed', handler)
  return () => window.removeEventListener('cookie-consent-changed', handler)
}
