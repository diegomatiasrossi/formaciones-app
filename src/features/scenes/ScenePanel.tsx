import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { Modal } from '@/components/ui/Modal'
import { CanonModal } from './CanonModal'
import clsx from 'clsx'

interface Props { canonLocked?: boolean; namesLocked?: boolean }

export function ScenePanel({ canonLocked, namesLocked }: Props) {
  const { t } = useTranslation()
  const {
    scenes, activeSceneId,
    setActiveScene, addScene, removeScene, renameScene, duplicateScene, reorderScenes,
    setFormationName, setTransitionType,
  } = useEditorStore()

  const [editingId,  setEditingId]  = useState<string | null>(null)
  const [editValue,  setEditValue]  = useState('')
  const [editField,  setEditField]  = useState<'name' | 'formation'>('name')
  const [sceneToDelete, setSceneToDelete] = useState<string | null>(null)
  const [transitionMenu, setTransitionMenu] = useState(false)
  const [canonSceneId, setCanonSceneId] = useState<string | null>(null)
  // Drag & drop para reordenar escenas (patrón HTML5 nativo, como CanonModal).
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

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
  const activeType = activeScene?.transitionType ?? 'simultaneous'

  return (
    <div className="border-t border-borde bg-negro shrink-0">
      {/* Timeline de escenas — bloques tipo editor de video */}
      <div className="flex items-center gap-2 px-3 py-2.5 overflow-x-auto">
        <span className="text-[10px] text-gris uppercase tracking-wider mr-1 shrink-0">
          {t('scenes.title')}
        </span>

        {scenes.map((scene, i) => (
          <div key={scene.id} className="flex items-center shrink-0 gap-2">
            <div
              className={clsx(
                'relative shrink-0 rounded-lg transition-opacity',
                editingId !== scene.id && 'cursor-grab active:cursor-grabbing',
                dragIdx === i && 'opacity-40',
                overIdx === i && dragIdx !== null && dragIdx !== i && 'ring-2 ring-dorado',
              )}
              draggable={editingId !== scene.id}
              onDragStart={() => setDragIdx(i)}
              onDragOver={e => { e.preventDefault(); if (overIdx !== i) setOverIdx(i) }}
              onDrop={e => {
                e.preventDefault()
                if (dragIdx !== null && dragIdx !== i) reorderScenes(dragIdx, i)
                setDragIdx(null); setOverIdx(null)
              }}
              onDragEnd={() => { setDragIdx(null); setOverIdx(null) }}
            >
              {editingId === scene.id && editField === 'name' ? (
                <input
                  autoFocus value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  onBlur={commitEdit} onKeyDown={handleKey}
                  className="w-28 h-16 bg-negro border border-dorado rounded-lg px-2 text-xs text-blanco-calido focus:outline-none text-center"
                />
              ) : (
                <button
                  onClick={() => setActiveScene(scene.id)}
                  onDoubleClick={namesLocked ? undefined : () => startEdit(scene.id, 'name', scene.name)}
                  title={namesLocked ? t('plan.scene_names_locked') : 'Doble click para renombrar'}
                  className={clsx(
                    'w-16 h-16 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-colors',
                    scene.id === activeSceneId
                      ? 'bg-dorado text-negro border-dorado'
                      : 'bg-surface-1 text-blanco-calido/70 border-borde hover:border-dorado/40 hover:text-blanco-calido',
                  )}
                >
                  <span className="text-xl font-bold leading-none tabular-nums">{i + 1}</span>
                  <span className="text-[9px] leading-tight truncate max-w-[3.5rem] px-1">{scene.name}</span>
                  {namesLocked && <UpgradeGate requiredPlan="solo_pro" featureName={t('plan.scene_names_locked')} compact />}
                </button>
              )}

              {/* Duplicar / borrar — solo en la escena activa (esquina sup. der.) */}
              {scene.id === activeSceneId && editingId !== scene.id && (
                <div className="absolute -top-1.5 -right-1.5 flex gap-0.5">
                  <button
                    id="btn-dup-scene"
                    onClick={() => duplicateScene(scene.id)}
                    title={t('common.duplicate')}
                    className="w-5 h-5 flex items-center justify-center text-[10px] rounded-full bg-negro border border-borde text-gris hover:text-dorado hover:border-dorado/50 transition-colors"
                  >⧉</button>
                  {scenes.length > 1 && (
                    <button
                      onClick={() => setSceneToDelete(scene.id)}
                      title={t('common.delete')}
                      className="w-5 h-5 flex items-center justify-center text-[10px] rounded-full bg-negro border border-borde text-gris hover:text-red-400 hover:border-red-400/50 transition-colors"
                    >×</button>
                  )}
                </div>
              )}
            </div>

            {/* Badge de canon entre escena N y N+1 */}
            {scenes[i + 1]?.transitionType === 'canon' && (
              <button
                onClick={() => setCanonSceneId(scenes[i + 1].id)}
                title={t('transition.canon_config_title')}
                className="shrink-0 text-[9px] font-semibold uppercase tracking-wider text-dorado bg-dorado/10 border border-dorado/40 rounded-full px-1.5 py-0.5 hover:bg-dorado/20 transition-colors"
              >
                {t('transition.badge')}
              </button>
            )}
          </div>
        ))}

        {/* + Agregar escena — bloque protagonista (el más grande) */}
        <button
          id="btn-new-scene"
          onClick={addScene}
          title={t('scenes.add')}
          className="w-20 h-20 shrink-0 ml-1 rounded-xl border-2 border-dashed border-dorado/50 bg-dorado/5
                     text-dorado flex flex-col items-center justify-center gap-1
                     hover:bg-dorado/10 hover:border-dorado transition-colors"
        >
          <span className="text-3xl leading-none font-light">+</span>
          <span className="text-[9px] uppercase tracking-wider">{t('scenes.add')}</span>
        </button>
      </div>

      {/* Sub-fila: formación + tipo de transición */}
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
              <span className="text-[10px] text-gris/40 ml-2">
                {inScene} {t('scenes.in_stage')} · {outScene} {t('scenes.off_stage')}
              </span>
            ) : null
          })()}

          {/* Tipo de transición — solo en escenas que no sean la primera (tienen
              transición de entrada desde la escena anterior). */}
          {!isFirst && (
            <div className="relative ml-auto">
              <button
                onClick={() => setTransitionMenu(v => !v)}
                title={t('transition.type_label')}
                className={clsx(
                  'text-[10px] px-2 py-0.5 rounded border transition-colors flex items-center gap-1',
                  activeType === 'canon'
                    ? 'border-dorado/60 text-dorado bg-dorado/10'
                    : 'border-borde/50 text-gris/60 hover:border-dorado/40 hover:text-dorado/70',
                )}
              >
                {t('transition.type_label')}: {activeType === 'canon' ? t('transition.canon') : t('transition.simultaneous')}
                <span className="text-gris/40">▾</span>
              </button>

              {transitionMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setTransitionMenu(false)} />
                  <div className="absolute right-0 bottom-full mb-1 z-20 w-44 bg-negro border border-borde rounded-lg shadow-card p-1">
                    <button
                      onClick={() => { setTransitionType(activeScene.id, 'simultaneous'); setTransitionMenu(false) }}
                      className={clsx(
                        'w-full text-left px-2 py-1.5 text-xs rounded hover:bg-surface-2 transition-colors',
                        activeType === 'simultaneous' ? 'text-dorado' : 'text-blanco-calido/80',
                      )}
                    >
                      {t('transition.simultaneous')}
                    </button>
                    <button
                      onClick={() => {
                        if (canonLocked) return
                        setTransitionMenu(false)
                        setCanonSceneId(activeScene.id)
                      }}
                      disabled={canonLocked}
                      className={clsx(
                        'w-full text-left px-2 py-1.5 text-xs rounded transition-colors flex items-center gap-1',
                        canonLocked
                          ? 'text-gris/30 cursor-not-allowed'
                          : activeType === 'canon'
                          ? 'text-dorado hover:bg-surface-2'
                          : 'text-blanco-calido/80 hover:bg-surface-2',
                      )}
                    >
                      {t('transition.canon')}…
                      {canonLocked && <UpgradeGate requiredPlan="solo_pro" featureName="Canon" compact />}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de configuración de canon */}
      <CanonModal sceneId={canonSceneId} onClose={() => setCanonSceneId(null)} />

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
