import { useEffect } from 'react'
import clsx from 'clsx'

interface Props {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
}

export function Modal({ open, onClose, title, children, className }: Props) {
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-negro/40 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={clsx('bg-blanco border border-borde-light rounded-2xl shadow-lg w-full p-6', className ?? 'max-w-md')}>
        {title && (
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-negro font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gris hover:text-negro text-lg leading-none">×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
