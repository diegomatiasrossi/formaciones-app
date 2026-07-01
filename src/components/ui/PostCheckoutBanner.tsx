import { useTranslation } from 'react-i18next'

interface Props {
  onDismiss: () => void
}

export function PostCheckoutBanner({ onDismiss }: Props) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-[#1a1a1a] border-b-2 border-[#C9A961] text-[#f5f5f0]">
      <span className="text-[#C9A961] text-base leading-none flex-shrink-0">★</span>
      <p className="flex-1 text-xs leading-snug">{t('checkout.success_banner')}</p>
      <button
        onClick={onDismiss}
        aria-label={t('common.close')}
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[#f5f5f0]/60 hover:text-[#f5f5f0] transition-colors text-base leading-none"
      >
        ×
      </button>
    </div>
  )
}
