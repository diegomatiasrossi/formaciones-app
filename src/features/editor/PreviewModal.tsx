import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Scene } from '@/types'
import clsx from 'clsx'

interface Props {
  open: boolean
  scenes: Scene[]
  onClose: () => void
  onPlay: (fromIndex: number, toIndex: number) => void
}

export function PreviewModal({ open, scenes, onClose, onPlay }: Props) {
  const { t } = useTranslation()
  const last = scenes.length - 1
  const [from, setFrom] = useState(0)
  const [to, setTo] = useState(last)
  // Qué extremo define el próximo click: primero "Desde", luego "Hasta".
  const [next, setNext] = useState<'from' | 'to'>('from')

  // Reset al abrir: "Todas" preseleccionado (primera → última).
  useEffect(() => {
    if (open) { setFrom(0); setTo(scenes.length - 1); setNext('from') }
  }, [open, scenes.length])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  function clickScene(i: number) {
    if (next === 'from') {
      setFrom(i); setTo(i); setNext('to')
    } else {
      // Segundo click define el otro extremo, ordenando para que from <= to.
      if (i >= from) setTo(i)
      else { setTo(from); setFrom(i) }
      setNext('from')
    }
  }

  function selectAll() { setFrom(0); setTo(last); setNext('from') }

  const valid = to > from

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-negro/60 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-negro border border-borde rounded-2xl shadow-card w-full max-w-md p-5 text-blanco-calido">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold tracking-wide">{t('editor.preview.title')}</h2>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>

        {/* Leyenda Desde / Hasta */}
        <div className="flex items-center gap-4 mb-2 text-[10px] uppercase tracking-wider">
          <span className="flex items-center gap-1.5 text-rojo">
            <span className="w-2.5 h-2.5 rounded-sm bg-rojo inline-block" /> {t('editor.preview.from')}
          </span>
          <span className="flex items-center gap-1.5 text-dorado">
            <span className="w-2.5 h-2.5 rounded-sm bg-dorado inline-block" /> {t('editor.preview.to')}
          </span>
        </div>

        {/* Lista de escenas */}
        <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto mb-3 pr-1">
          {scenes.map((scene, i) => {
            const isFrom = i === from
            const isTo   = i === to
            const inRange = i > from && i < to
            return (
              <button
                key={scene.id}
                onClick={() => clickScene(i)}
                title={scene.name}
                className={clsx(
                  'px-2.5 py-1.5 rounded-md border text-xs transition-colors max-w-[140px] truncate',
                  isFrom && 'border-rojo bg-rojo/15 text-rojo font-semibold',
                  isTo && !isFrom && 'border-dorado bg-dorado/15 text-dorado font-semibold',
                  inRange && 'border-borde-hover bg-blanco-calido/5 text-blanco-calido',
                  !isFrom && !isTo && !inRange && 'border-borde text-gris hover:border-dorado/40 hover:text-blanco-calido',
                )}
              >
                {i + 1}. {scene.name}
              </button>
            )
          })}
        </div>

        {!valid && (
          <p className="text-[11px] text-dorado/80 mb-3">{t('editor.preview.need_two')}</p>
        )}

        {/* Acciones */}
        <div className="flex items-center gap-2">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 text-xs rounded-md border border-borde text-gris hover:border-dorado/50 hover:text-dorado transition-colors"
          >
            {t('editor.preview.all')}
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="px-3 py-1.5 text-xs text-gris hover:text-blanco-calido transition-colors">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => onPlay(from, to)}
            disabled={!valid}
            className="px-4 py-1.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {t('editor.preview.play')}
          </button>
        </div>
      </div>
    </div>
  )
}
