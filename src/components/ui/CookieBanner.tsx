import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const KEY = 'crewficina_cookies_accepted'

export function CookieBanner() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(() => !localStorage.getItem(KEY))

  if (!visible) return null

  function accept() {
    localStorage.setItem(KEY, 'all')
    setVisible(false)
  }

  function essential() {
    localStorage.setItem(KEY, 'essential')
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
            background: '#B8962E', color: '#1C1C1C',
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
