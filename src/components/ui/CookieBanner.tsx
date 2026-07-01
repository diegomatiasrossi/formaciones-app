import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export const COOKIE_CONSENT_KEY = 'crewficina_cookies_accepted'

export function CookieBanner() {
  const { t } = useTranslation()
  // try/catch: si localStorage no es accesible (modos privados), mostrar el banner
  // por defecto en vez de crashear el render (que lo ocultaría vía ErrorBoundary).
  const [visible, setVisible] = useState(() => {
    try { return !localStorage.getItem(COOKIE_CONSENT_KEY) } catch { return true }
  })

  if (!visible) return null

  function accept() {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, 'all') } catch { /* ignore */ }
    setVisible(false)
  }

  function essential() {
    try { localStorage.setItem(COOKIE_CONSENT_KEY, 'essential') } catch { /* ignore */ }
    setVisible(false)
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#1C1C1C',
        borderTop: '1px solid #2a2a2a',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <p style={{ fontSize: 13, color: '#F2F0EB', flex: 1, minWidth: 200, margin: 0 }}>
        {t('cookies.message')}
      </p>
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        <button
          onClick={essential}
          style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 500,
            background: 'transparent', color: '#888',
            border: '1px solid #333', borderRadius: 7,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          {t('cookies.essential_only')}
        </button>
        <button
          onClick={accept}
          style={{
            padding: '8px 16px', fontSize: 12, fontWeight: 700,
            background: '#C9A961', color: '#1C1C1C',
            border: 'none', borderRadius: 7,
            cursor: 'pointer', fontFamily: 'Inter, sans-serif',
          }}
        >
          {t('cookies.accept_all')}
        </button>
      </div>
    </div>
  )
}
