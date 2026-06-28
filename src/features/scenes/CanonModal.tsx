import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal } from '@/components/ui/Modal'
import { useEditorStore } from '@/store/editorStore'
import { DEFAULT_CANON_CONFIG } from '@/types'
import type { CanonConfig, CanonOrder } from '@/types'
import clsx from 'clsx'

const DIRECTIONS: { id: CanonOrder; i18nKey: string; icon: string }[] = [
  { id: 'left-to-right', i18nKey: 'transition.dir_left_to_right', icon: '→' },
  { id: 'right-to-left', i18nKey: 'transition.dir_right_to_left', icon: '←' },
  { id: 'front-to-back', i18nKey: 'transition.dir_front_to_back', icon: '↑' },
  { id: 'back-to-front', i18nKey: 'transition.dir_back_to_front', icon: '↓' },
  { id: 'manual',        i18nKey: 'transition.dir_manual',        icon: '☰' },
]

interface Props {
  /** Escena DESTINO cuya transición de entrada se configura (null = cerrado). */
  sceneId: string | null
  onClose: () => void
}

export function CanonModal({ sceneId, onClose }: Props) {
  const { t } = useTranslation()
  const { scenes, setTransitionType, setCanonConfig } = useEditorStore()

  const scene = scenes.find(s => s.id === sceneId)
  const dancers = useMemo(
    () => (scene?.dancers ?? []).filter(d => d.active !== false),
    [scene],
  )

  const [draft, setDraft] = useState<CanonConfig>(DEFAULT_CANON_CONFIG)
  const dragIndex = useRef<number | null>(null)

  // Inicializa el borrador cuando se abre el modal para una escena.
  useEffect(() => {
    if (!sceneId || !scene) return
    const base = scene.canonConfig ?? DEFAULT_CANON_CONFIG
    setDraft({
      order: base.order,
      offsetSeconds: base.offsetSeconds,
      selection: base.selection === 'all' ? 'all' : [...base.selection],
      manualOrder: base.manualOrder?.length ? [...base.manualOrder] : dancers.map(d => d.id),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneId])

  // Lista de integrantes en el orden manual actual (respeta manualOrder y agrega
  // al final los que falten).
  const orderedManual = useMemo(() => {
    const byId = new Map(dancers.map(d => [d.id, d]))
    const seen = new Set<string>()
    const list: typeof dancers = []
    for (const id of draft.manualOrder ?? []) {
      const d = byId.get(id)
      if (d) { list.push(d); seen.add(id) }
    }
    for (const d of dancers) if (!seen.has(d.id)) list.push(d)
    return list
  }, [dancers, draft.manualOrder])

  function handleDrop(targetIdx: number) {
    const from = dragIndex.current
    dragIndex.current = null
    if (from === null || from === targetIdx) return
    const ids = orderedManual.map(d => d.id)
    const [moved] = ids.splice(from, 1)
    ids.splice(targetIdx, 0, moved)
    setDraft(d => ({ ...d, manualOrder: ids }))
  }

  const isChoosing = draft.selection !== 'all'
  function toggleParticipant(id: string) {
    setDraft(d => {
      const cur = d.selection === 'all' ? dancers.map(x => x.id) : [...d.selection]
      const next = cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]
      return { ...d, selection: next }
    })
  }

  function save() {
    if (!sceneId) return
    setTransitionType(sceneId, 'canon')
    setCanonConfig(sceneId, {
      order: draft.order,
      offsetSeconds: Math.max(0.1, draft.offsetSeconds),
      selection: draft.selection,
      manualOrder: draft.order === 'manual' ? orderedManual.map(d => d.id) : draft.manualOrder,
    })
    onClose()
  }

  const dancerName = (d: { name: string }, i: number) => d.name?.trim() || `B${i + 1}`

  return (
    <Modal open={!!sceneId} onClose={onClose} title={t('transition.canon_config_title')} className="max-w-lg">
      <div className="space-y-4">
        {/* Dirección */}
        <div>
          <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">
            {t('transition.direction')}
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {DIRECTIONS.map(d => (
              <button
                key={d.id}
                onClick={() => setDraft(prev => ({ ...prev, order: d.id }))}
                title={t(d.i18nKey as Parameters<typeof t>[0])}
                className={clsx(
                  'flex flex-col items-center gap-1 py-2 rounded-lg border text-[10px] transition-colors',
                  draft.order === d.id
                    ? 'border-dorado bg-dorado/10 text-negro font-semibold'
                    : 'border-borde-light text-gris hover:border-dorado/50',
                )}
              >
                <span className="text-base leading-none">{d.icon}</span>
                {t(d.i18nKey as Parameters<typeof t>[0])}
              </button>
            ))}
          </div>
        </div>

        {/* Orden manual (drag & drop) */}
        {draft.order === 'manual' && (
          <div>
            <p className="text-[10px] text-gris/70 mb-1.5">{t('transition.manual_hint')}</p>
            <ul className="max-h-44 overflow-y-auto space-y-1 pr-1">
              {orderedManual.map((d, i) => (
                <li
                  key={d.id}
                  draggable
                  onDragStart={() => { dragIndex.current = i }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(i)}
                  className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-borde-light bg-crema text-sm text-negro cursor-grab active:cursor-grabbing"
                >
                  <span className="text-gris/50 select-none">⠿</span>
                  <span className="text-dorado-oscuro font-semibold tabular-nums w-5">{i + 1}</span>
                  <span className="truncate">{dancerName(d, i)}</span>
                </li>
              ))}
              {orderedManual.length === 0 && (
                <li className="text-xs text-gris/50 italic px-2.5 py-2">—</li>
              )}
            </ul>
          </div>
        )}

        {/* Participantes */}
        <div>
          <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">
            {t('transition.participants')}
          </label>
          <div className="flex gap-1.5 mb-2">
            <button
              onClick={() => setDraft(d => ({ ...d, selection: 'all' }))}
              className={clsx(
                'px-3 py-1.5 rounded-lg border text-xs transition-colors',
                !isChoosing
                  ? 'border-dorado bg-dorado/10 text-negro font-semibold'
                  : 'border-borde-light text-gris hover:border-dorado/50',
              )}
            >
              {t('transition.participants_all')}
            </button>
            <button
              onClick={() => setDraft(d => ({ ...d, selection: d.selection === 'all' ? dancers.map(x => x.id) : d.selection }))}
              className={clsx(
                'px-3 py-1.5 rounded-lg border text-xs transition-colors',
                isChoosing
                  ? 'border-dorado bg-dorado/10 text-negro font-semibold'
                  : 'border-borde-light text-gris hover:border-dorado/50',
              )}
            >
              {t('transition.participants_some')}
            </button>
          </div>

          {isChoosing && (
            <div className="max-h-36 overflow-y-auto grid grid-cols-2 gap-1 pr-1">
              {dancers.map((d, i) => {
                const checked = draft.selection !== 'all' && draft.selection.includes(d.id)
                return (
                  <label key={d.id} className="flex items-center gap-2 text-sm text-negro cursor-pointer px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleParticipant(d.id)}
                      className="accent-dorado"
                    />
                    <span className="truncate">{dancerName(d, i)}</span>
                  </label>
                )
              })}
            </div>
          )}
        </div>

        {/* Desfase */}
        <div>
          <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">
            {t('transition.offset_seconds_label')}
          </label>
          <input
            type="number"
            min={0.1}
            step={0.1}
            value={draft.offsetSeconds}
            onChange={e => setDraft(d => ({ ...d, offsetSeconds: Math.max(0.1, Number(e.target.value) || 0.1) }))}
            className="w-28 bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo"
          />
        </div>

        {/* Acciones */}
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gris hover:text-negro">
            {t('common.cancel')}
          </button>
          <button
            onClick={save}
            className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </Modal>
  )
}
