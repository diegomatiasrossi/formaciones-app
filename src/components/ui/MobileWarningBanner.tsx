import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useIsMobile } from '@/hooks/useIsMobile'

const SESSION_KEY = 'crewficina_mobile_warning_dismissed'

export function MobileWarningBanner() {
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(SESSION_KEY) === '1',
  )

  if (!isMobile || dismissed) return null

  function dismiss() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#1a1a1a] border-b-2 border-[#C9A961] text-[#f5f5f0]">
      <span className="text-[#C9A961] text-base leading-none flex-shrink-0">⬡</span>
      <p className="flex-1 text-xs leading-snug">{t('editor.mobile_warning')}</p>
      <button
        onClick={dismiss}
        aria-label="Cerrar"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#f5f5f0]/60 hover:text-[#f5f5f0] transition-colors text-base leading-none"
      >
        ×
      </button>
    </div>
  )
}
