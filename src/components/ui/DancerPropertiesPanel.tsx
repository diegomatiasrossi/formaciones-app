import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import type { Dancer, DancerLevel, DancerShape, DancerFacing, EdgeSide } from '@/types'
import { LEVEL_META, LEVEL_OPACITY, LEVEL_SCALE, SIZE_OPTIONS } from '@/types'
import clsx from 'clsx'

interface Props {
  dancer: Dancer
  onClose: () => void
}

const SHAPES: { icon: string; value: DancerShape }[] = [
  { icon: '●', value: 'circle' },
  { icon: '■', value: 'square' },
  { icon: '▲', value: 'triangle' },
]

const COLOR_SWATCHES = [
  '#C9A961', '#FFFFFF', '#FF4466', '#FF8C42',
  '#FFD700', '#44DDAA', '#44AAFF', '#AA44FF',
  '#FF44AA', '#2ECC71', '#E74C3C', '#3498DB',
]

const EDGE_OPTIONS: { value: EdgeSide; label: string }[] = [
  { value: 'top',    label: '↑' },
  { value: 'bottom', label: '↓' },
  { value: 'left',   label: '←' },
  { value: 'right',  label: '→' },
]

// Grilla 3x3 de dirección (centro vacío). Fila superior = mirando atrás (lejos
// del público), fila inferior = mirando al público.
const FACING_GRID: ({ value: DancerFacing; arrow: string } | null)[] = [
  { value: 'diagonal-back-left',  arrow: '↖' }, { value: 'back',     arrow: '↑' }, { value: 'diagonal-back-right',  arrow: '↗' },
  { value: 'left',                arrow: '←' }, null,                              { value: 'right',                arrow: '→' },
  { value: 'diagonal-front-left', arrow: '↙' }, { value: 'audience', arrow: '↓' }, { value: 'diagonal-front-right', arrow: '↘' },
]

export function DancerPropertiesPanel({ dancer, onClose }: Props) {
  const { t } = useTranslation()
  const { renameDancer, setColor, setShape, setSize, setLevel, setFacing, setDancerPresence } = useEditorStore()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const isActive = dancer.active !== false

  const row = (label: string, children: React.ReactNode) => (
    <div className="flex items-start gap-3 py-2 border-b border-borde/50 last:border-0">
      <span className="text-[10px] text-gris uppercase tracking-wider w-14 shrink-0 pt-1.5">{label}</span>
      <div className="flex items-center gap-1.5 flex-wrap flex-1">{children}</div>
    </div>
  )

  const selBtn = (active: boolean, onClick: () => void, children: React.ReactNode, title?: string) => (
    <button
      onClick={onClick}
      title={title}
      className={clsx(
        'px-2.5 py-1.5 rounded border text-xs transition-colors',
        active
          ? 'bg-dorado border-dorado text-negro font-medium'
          : 'border-borde text-blanco-calido/80 hover:border-dorado/50 hover:text-dorado',
      )}
    >
      {children}
    </button>
  )

  return (
    <div className="absolute top-3 right-3 z-20 w-72 bg-negro border border-borde rounded-xl shadow-2xl p-4 max-h-[calc(100vh-24px)] overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: dancer.color }} />
          <span className="text-[10px] text-dorado uppercase tracking-widest">Integrante</span>
        </div>
        <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
      </div>

      {/* Nombre */}
      {row(t('common.rename'),
        <input
          type="text"
          value={dancer.name}
          onChange={e => renameDancer(dancer.id, e.target.value)}
          className="flex-1 bg-negro border border-borde rounded px-2 py-1 text-xs text-blanco-calido
                     focus:outline-none focus:border-dorado min-w-0"
          maxLength={20}
        />,
      )}

      {/* Color: swatches + picker */}
      {row(t('editor.toolbar.color'),
        <>
          <div className="flex flex-wrap gap-1.5 w-full">
            {COLOR_SWATCHES.map(c => (
              <button
                key={c}
                onClick={() => setColor([dancer.id], c)}
                style={{ backgroundColor: c }}
                className={clsx(
                  'w-6 h-6 rounded-full border-2 transition-all hover:scale-110',
                  dancer.color === c ? 'border-blanco-calido scale-110' : 'border-transparent',
                )}
                title={c}
              />
            ))}
            <label
              className={clsx(
                'w-6 h-6 rounded-full border-2 cursor-pointer overflow-hidden flex items-center justify-center',
                'border-borde hover:border-dorado/60 transition-colors relative',
                !COLOR_SWATCHES.includes(dancer.color) ? 'border-blanco-calido' : '',
              )}
              title="Color personalizado"
              style={{ backgroundColor: !COLOR_SWATCHES.includes(dancer.color) ? dancer.color : 'transparent' }}
            >
              {COLOR_SWATCHES.includes(dancer.color) && (
                <span className="text-gris text-[10px] leading-none">+</span>
              )}
              <input
                type="color"
                value={dancer.color}
                onChange={e => setColor([dancer.id], e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </label>
          </div>
        </>,
      )}

      {/* Forma */}
      {row(t('editor.toolbar.shape'),
        SHAPES.map(s => selBtn(dancer.shape === s.value, () => setShape([dancer.id], s.value), s.icon)),
      )}

      {/* Tamaño */}
      {row(t('editor.toolbar.size'),
        SIZE_OPTIONS.map(s => selBtn(
          dancer.size === s.value,
          () => setSize([dancer.id], s.value),
          <span className="flex items-center gap-1.5">
            <span
              className="rounded-full bg-current inline-block shrink-0"
              style={{ width: s.value * 0.9, height: s.value * 0.9, minWidth: 6, minHeight: 6 }}
            />
            {s.label}
          </span>,
        )),
      )}

      {/* Nivel */}
      {row(t('levels.title'),
        <div className="flex gap-1.5 flex-wrap">
          {(Object.entries(LEVEL_META) as [DancerLevel, typeof LEVEL_META[DancerLevel]][]).map(([lv, meta]) => (
            <button
              key={lv}
              onClick={() => setLevel(dancer.id, lv)}
              title={meta.label}
              className={clsx(
                'px-2 py-1.5 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all text-xs min-w-[44px]',
                dancer.level === lv
                  ? 'border-dorado bg-dorado/10 text-dorado'
                  : 'border-borde text-gris hover:border-dorado/40',
              )}
            >
              <span style={{ opacity: LEVEL_OPACITY[lv], transform: `scale(${LEVEL_SCALE[lv]})`, display: 'inline-block' }}>
                {meta.emoji}
              </span>
              <span className="text-[9px]">{meta.label}</span>
            </button>
          ))}
        </div>,
      )}

      {/* Dirección */}
      {row(t('editor.facing'),
        <div className="grid grid-cols-3 gap-1 w-[108px]">
          {FACING_GRID.map((cell, i) => (
            cell === null
              ? <div key={i} />
              : (
                <button
                  key={i}
                  onClick={() => setFacing(dancer.id, cell.value)}
                  title={t(`editor.facing_${cell.value.replace(/-/g, '_')}`)}
                  className={clsx(
                    'h-8 rounded border text-sm transition-colors flex items-center justify-center',
                    (dancer.facing ?? 'audience') === cell.value
                      ? 'border-dorado bg-dorado/10 text-dorado'
                      : 'border-borde text-gris hover:border-dorado/40 hover:text-dorado',
                  )}
                >
                  {cell.arrow}
                </button>
              )
          ))}
        </div>,
      )}

      {/* En escena */}
      <div className="py-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-gris uppercase tracking-wider">En escena</span>
          <button
            onClick={() => setDancerPresence(dancer.id, !isActive)}
            className={clsx(
              'relative w-10 h-5 rounded-full transition-colors',
              isActive ? 'bg-dorado' : 'bg-borde',
            )}
          >
            <span className={clsx(
              'absolute top-0.5 w-4 h-4 rounded-full bg-negro transition-transform',
              isActive ? 'translate-x-5' : 'translate-x-0.5',
            )} />
          </button>
        </div>
        {isActive && (
          <div>
            <span className="text-[10px] text-gris/60 mb-1.5 block">Entra por:</span>
            <div className="flex gap-1.5">
              {EDGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDancerPresence(dancer.id, true, opt.value, dancer.exitEdge)}
                  className={clsx(
                    'flex-1 py-1.5 rounded border text-sm transition-colors',
                    dancer.entryEdge === opt.value
                      ? 'border-dorado bg-dorado/10 text-dorado'
                      : 'border-borde/60 text-gris/60 hover:border-borde',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {!isActive && (
          <div>
            <span className="text-[10px] text-gris/60 mb-1.5 block">Sale por:</span>
            <div className="flex gap-1.5">
              {EDGE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setDancerPresence(dancer.id, false, dancer.entryEdge, opt.value)}
                  className={clsx(
                    'flex-1 py-1.5 rounded border text-sm transition-colors',
                    dancer.exitEdge === opt.value
                      ? 'border-dorado bg-dorado/10 text-dorado'
                      : 'border-borde/60 text-gris/60 hover:border-borde',
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <p className="text-[10px] text-gris/40 mt-2 text-center">Esc para cerrar</p>
    </div>
  )
}
