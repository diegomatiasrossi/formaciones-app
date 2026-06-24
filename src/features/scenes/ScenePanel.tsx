import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { Modal } from '@/components/ui/Modal'
import type { Scene } from '@/types'
import clsx from 'clsx'

type CanonOrder = NonNullable<Scene['canonOrder']>

const CANON_ORDERS: { id: CanonOrder; i18nKey: string; icon: string }[] = [
  { id: 'by-index',       i18nKey: 'transition.order_by_index',      icon: '→' },
  { id: 'left-to-right',  i18nKey: 'transition.order_left_to_right', icon: '⇒' },
  { id: 'right-to-left',  i18nKey: 'transition.order_right_to_left', icon: '⇐' },
  { id: 'center-out',     i18nKey: 'transition.order_center_out',    icon: '⊙' },
]

interface Props { canonLocked?: boolean; namesLocked?: boolean }

export function ScenePanel({ canonLocked, namesLocked }: Props) {
  const { t } = useTranslation()
  const {
    scenes, activeSceneId, canons,
    setActiveScene, addScene, removeScene, renameScene, duplicateScene,
    setFormationName, updateSceneTransition, addCanon, removeCanon,
  } = useEditorStore()

  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editValue,  setEditValue]  = useState('')
  const [editField,  setEditField]  = useState<'name' | 'formation'>('name')
  const [showTransition, setShowTransition] = useState(false)
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null)
  const [showCanonModal, setShowCanonModal] = useState(false)
  const [canonForm, setCanonForm] = useState({ fromScene: 0, toScene: 0, offsetBeats: 8, label: '' })

  function saveCanon() {
    if (scenes.length === 0) return
    addCanon({
      fromScene: canonForm.fromScene,
      toScene: canonForm.toScene,
      offsetBeats: Math.max(0, canonForm.offsetBeats),
      label: canonForm.label.trim() || undefined,
    })
    setCanonForm({ fromScene: 0, toScene: 0, offsetBeats: 8, label: '' })
    setShowCanonModal(false)
  }

  function startEdit(id: string, field: 'name' | 'formation', current: string) {
    setEditingId(id); setEditField(field); setEditValue(current)
  }

  function commitEdit() {
    if (!editingId) return
    if (editField === 'name' && editValue.trim()) renameScene(editingId, editValue.trim())
    if (editField === 'formation') setFormationName(editingId, editValue.trim())
    setEditingId(null)
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingId(null)
  }

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const isFirst = activeScene && scenes[0]?.id === activeSceneId

  // Compute estimated canon duration
  function canonEstimate(scene: Scene): string {
    const n = scene.dancers.filter(d => d.active !== false).length
    const delay = scene.canonDelayMs ?? 150
    const base = 1500 // default transitionMs from EditorLayout
    const totalMs = base + Math.max(0, n - 1) * delay
    return (totalMs / 1000).toFixed(1)
  }

  return (
    <div className="border-t border-borde bg-negro shrink-0">
      {/* Tabs de escenas */}
      <div className="flex items-center gap-1 px-3 py-1.5 overflow-x-auto">
        <span className="text-[10px] text-gris uppercase tracking-wider mr-1.5 shrink-0">
          {t('scenes.title')}
        </span>

        {scenes.map((scene, i) => (
          <div key={scene.id} className="flex items-center shrink-0 gap-0.5">
            {editingId === scene.id && editField === 'name' ? (
              <input
                autoFocus value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={commitEdit} onKeyDown={handleKey}
                className="w-28 bg-negro border border-dorado rounded px-2 py-0.5 text-xs text-blanco-calido focus:outline-none"
              />
            ) : (
              <button
                onClick={() => setActiveScene(scene.id)}
                onDoubleClick={namesLocked ? undefined : () => startEdit(scene.id, 'name', scene.name)}
                title={namesLocked ? t('plan.scene_names_locked') : 'Doble click para renombrar'}
                className={clsx(
                  'px-2.5 py-1 rounded text-xs transition-colors border whitespace-nowrap flex items-center gap-1',
                  scene.id === activeSceneId
                    ? 'bg-dorado text-negro border-dorado font-semibold'
                    : 'text-blanco-calido/70 border-borde hover:border-dorado/40 hover:text-blanco-calido',
                )}
              >
                {i + 1}. {scene.name}
                {scene.transitionMode === 'canon' && (
                  <span className="ml-1 text-dorado/60 text-[9px]">↩︎</span>
                )}
                {namesLocked && <UpgradeGate requiredPlan="solo_pro" featureName={t('plan.scene_names_locked')} compact />}
              </button>
            )}

            {scene.id === activeSceneId && (
              <>
                <button
                  id="btn-dup-scene"
                  onClick={() => duplicateScene(scene.id)}
                  title={`${t('common.duplicate')}`}
                  className="w-5 h-5 flex items-center justify-center text-[11px] text-gris hover:text-dorado transition-colors"
                >⧉</button>
                {scenes.length > 1 && (
                  <button
                    onClick={() => setSceneToDelete(scene.id)}
                    title={t('common.delete')}
                    className="w-5 h-5 flex items-center justify-center text-[11px] text-gris hover:text-red-400 transition-colors"
                  >×</button>
                )}
              </>
            )}
          </div>
        ))}

        <button
          id="btn-new-scene"
          onClick={addScene}
          className="px-2 py-1 text-xs text-gris border border-borde border-dashed rounded hover:border-dorado/50 hover:text-dorado transition-colors shrink-0 ml-1"
        >
          + {t('scenes.add')}
        </button>

        {scenes.length > 1 && (
          <button
            onClick={() => { setCanonForm({ fromScene: 0, toScene: scenes.length - 1, offsetBeats: 8, label: '' }); setShowCanonModal(true) }}
            className="px-2 py-1 text-xs text-dorado/70 border border-dorado/30 border-dashed rounded hover:border-dorado hover:text-dorado transition-colors shrink-0 ml-1"
          >
            {t('canon.title')} +
          </button>
        )}
      </div>

      {/* Badges de canones definidos */}
      {canons.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pb-1.5 flex-wrap">
          {canons.map(c => (
            <span key={c.id} className="group flex items-center gap-1 text-[10px] text-dorado bg-dorado/10 border border-dorado/30 rounded-full px-2 py-0.5">
              ↪︎ {c.label || `${t('canon.title')}`}: {t('scenes.scene')} {c.fromScene + 1}→{c.toScene + 1} · {c.offsetBeats}t
              <button onClick={() => removeCanon(c.id)} className="text-dorado/50 hover:text-red-400 ml-0.5">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Sub-fila: formación + transición */}
      {activeScene && (
        <div className="flex items-center gap-2 px-3 pb-1.5 flex-wrap">
          <span className="text-[10px] text-gris/50 uppercase tracking-wider">{t('scenes.formation_label')}</span>
          {editingId === activeScene.id && editField === 'formation' ? (
            <input
              autoFocus value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={commitEdit} onKeyDown={handleKey}
              placeholder="ej: Círculo inicial"
              className="flex-1 max-w-xs bg-negro border border-dorado rounded px-2 py-0.5 text-xs text-blanco-calido focus:outline-none"
            />
          ) : namesLocked ? (
            <span className="flex items-center gap-1 text-xs text-gris/40 italic">
              {activeScene.formationName || t('scenes.formation_unnamed')}
              <UpgradeGate requiredPlan="solo_pro" featureName={t('plan.scene_names_locked')} compact />
            </span>
          ) : (
            <button
              onClick={() => startEdit(activeScene.id, 'formation', activeScene.formationName ?? '')}
              className="text-xs text-gris/70 hover:text-dorado transition-colors italic"
            >
              {activeScene.formationName || t('scenes.formation_unnamed_hint')}
            </button>
          )}

          {/* Presencia */}
          {activeScene.dancers.length > 0 && (() => {
            const inScene  = activeScene.dancers.filter(d => d.active !== false).length
            const outScene = activeScene.dancers.length - inScene
            return outScene > 0 ? (
              <span className="text-[10px] text-gris/40 ml-auto">
                {inScene} {t('scenes.in_stage')} · {outScene} {t('scenes.off_stage')}
              </span>
            ) : null
          })()}

          {/* Botón transición — solo visible en escenas que no sean la primera */}
          {!isFirst && (
            <button
              onClick={() => setShowTransition(v => !v)}
              title={t('transition.title')}
              className={clsx(
                'ml-auto text-[10px] px-2 py-0.5 rounded border transition-colors',
                showTransition
                  ? 'border-dorado/60 text-dorado bg-dorado/10'
                  : 'border-borde/50 text-gris/50 hover:border-dorado/40 hover:text-dorado/70',
                activeScene.transitionMode === 'canon' && !showTransition && 'border-dorado/30 text-dorado/60',
              )}
            >
              {t('transition.title')}
              {activeScene.transitionMode === 'canon' && ' ↩︎'}
            </button>
          )}
        </div>
      )}

      {/* Panel de transición de canon */}
      {showTransition && activeScene && !isFirst && (
        <div className="px-3 pb-2 border-t border-borde/30 pt-2 bg-surface-1">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector Unísono / Canon */}
            <div className="flex gap-1">
              <button
                onClick={() => updateSceneTransition(activeScene.id, { transitionMode: 'unison' })}
                className={clsx(
                  'px-2.5 py-1 text-[10px] rounded border transition-colors',
                  (activeScene.transitionMode ?? 'unison') === 'unison'
                    ? 'border-dorado text-dorado bg-dorado/10'
                    : 'border-borde/50 text-gris/60 hover:border-dorado/40',
                )}
              >
                {t('transition.unison')}
              </button>
              <button
                onClick={() => !canonLocked && updateSceneTransition(activeScene.id, { transitionMode: 'canon' })}
                disabled={canonLocked}
                className={clsx(
                  'px-2.5 py-1 text-[10px] rounded border transition-colors flex items-center gap-1',
                  canonLocked
                    ? 'border-borde/30 text-gris/30 cursor-not-allowed'
                    : (activeScene.transitionMode ?? 'unison') === 'canon'
                    ? 'border-dorado text-dorado bg-dorado/10'
                    : 'border-borde/50 text-gris/60 hover:border-dorado/40',
                )}
                title={canonLocked ? 'Canon requiere plan Solo Pro' : t('transition.canon_tooltip')}
              >
                {t('transition.canon')}
                {canonLocked && <UpgradeGate requiredPlan="solo_pro" featureName="Canon" compact />}
              </button>
            </div>

            {/* Opciones de canon */}
            {activeScene.transitionMode === 'canon' && (
              <>
                {/* Orden */}
                <div className="flex gap-1">
                  {CANON_ORDERS.map(o => (
                    <button
                      key={o.id}
                      onClick={() => updateSceneTransition(activeScene.id, { canonOrder: o.id })}
                      title={t(o.i18nKey as Parameters<typeof t>[0])}
                      className={clsx(
                        'w-7 h-7 text-sm rounded border transition-colors',
                        (activeScene.canonOrder ?? 'by-index') === o.id
                          ? 'border-dorado text-dorado bg-dorado/10'
                          : 'border-borde/50 text-gris/60 hover:border-dorado/40',
                      )}
                    >
                      {o.icon}
                    </button>
                  ))}
                </div>

                {/* Delay slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gris/50">{t('transition.delay')}</span>
                  <input
                    type="range"
                    min={50} max={500} step={25}
                    value={activeScene.canonDelayMs ?? 150}
                    onChange={e => updateSceneTransition(activeScene.id, { canonDelayMs: Number(e.target.value) })}
                    className="w-20 accent-dorado"
                  />
                  <span className="text-[10px] text-dorado tabular-nums w-8">
                    {activeScene.canonDelayMs ?? 150}ms
                  </span>
                </div>

                {/* Estimación duración */}
                <span className="text-[10px] text-gris/40 ml-auto">
                  {t('transition.duration_hint', { s: canonEstimate(activeScene) })}
                </span>
              </>
            )}
          </div>

          {/* Tooltip pedagógico */}
          {activeScene.transitionMode === 'canon' && (
            <p className="text-[10px] text-gris/40 mt-1.5 leading-relaxed">
              {t('transition.canon_tooltip')}
            </p>
          )}
        </div>
      )}

      {/* Definir canon entre escenas */}
      <Modal open={showCanonModal} onClose={() => setShowCanonModal(false)} title={t('canon.title')}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('canon.from')}</label>
              <select value={canonForm.fromScene} onChange={e => setCanonForm(f => ({ ...f, fromScene: Number(e.target.value) }))}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo">
                {scenes.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('canon.to')}</label>
              <select value={canonForm.toScene} onChange={e => setCanonForm(f => ({ ...f, toScene: Number(e.target.value) }))}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo">
                {scenes.map((s, i) => <option key={s.id} value={i}>{i + 1}. {s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('canon.offset')}</label>
            <input type="number" min={0} value={canonForm.offsetBeats}
              onChange={e => setCanonForm(f => ({ ...f, offsetBeats: Number(e.target.value) }))}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
          </div>
          <div>
            <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">{t('canon.name')}</label>
            <input value={canonForm.label} onChange={e => setCanonForm(f => ({ ...f, label: e.target.value }))}
              placeholder={t('canon.name')}
              className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-rojo" />
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={() => setShowCanonModal(false)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
            <button onClick={saveCanon} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg">{t('common.save')}</button>
          </div>
        </div>
      </Modal>

      {/* Confirmación de borrado de escena */}
      <Modal open={!!sceneToDelete} onClose={() => setSceneToDelete(null)} title={t('scenes.delete_confirm')}>
        <p className="text-sm text-negro/80 mb-4">{t('scenes.delete_warning')}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setSceneToDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro">{t('common.cancel')}</button>
          <button
            onClick={() => { if (sceneToDelete) removeScene(sceneToDelete); setSceneToDelete(null) }}
            className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg"
          >
            {t('common.delete')}
          </button>
        </div>
      </Modal>
    </div>
  )
}
