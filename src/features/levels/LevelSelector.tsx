import { useTranslation } from 'react-i18next'
import type { Dancer, DancerLevel } from '@/types'
import { useEditorStore } from '@/store/editorStore'
import clsx from 'clsx'

const LEVELS: { value: DancerLevel; emoji: string; keyLabel: string }[] = [
  { value: 'floor',    emoji: '—', keyLabel: 'levels.floor' },
  { value: 'mid',      emoji: '≈', keyLabel: 'levels.mid' },
  { value: 'standing', emoji: '|', keyLabel: 'levels.standing' },
  { value: 'aerial',   emoji: '↑', keyLabel: 'levels.aerial' },
]

interface Props {
  dancer: Dancer
}

export function LevelSelector({ dancer }: Props) {
  const { t } = useTranslation()
  const setLevel = useEditorStore(s => s.setLevel)

  return (
    <div className="flex flex-col gap-1">
      {LEVELS.map(lv => (
        <button
          key={lv.value}
          onClick={() => setLevel(dancer.id, lv.value)}
          className={clsx(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-md border text-xs transition-colors',
            dancer.level === lv.value
              ? 'border-dorado bg-dorado/10 text-dorado'
              : 'border-borde text-blanco-calido/70 hover:border-dorado/40 hover:text-blanco-calido',
          )}
        >
          <span className="w-4 text-center text-gris">{lv.emoji}</span>
          {t(lv.keyLabel)}
        </button>
      ))}
      <p className="text-[10px] text-gris/60 mt-1 leading-relaxed">
        El nivel afecta opacidad y escala visual del bailarín.
      </p>
    </div>
  )
}
