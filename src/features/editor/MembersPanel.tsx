import { useCallback, useEffect, useState, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { useCrewStore } from '@/store/crewStore'
import { useEditorStore } from '@/store/editorStore'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { supabase } from '@/features/auth/supabaseClient'

interface Props { onClose: () => void }

const inputCls = 'w-full bg-negro border border-borde rounded-md px-2.5 py-1.5 text-xs text-blanco-calido focus:outline-none focus:border-dorado placeholder:text-gris/30'

export function MembersPanel({ onClose }: Props) {
  const { t } = useTranslation()
  const { projectId } = useParams<{ projectId: string }>()
  const { projects, saveProject } = useProjectStore()
  const { members, fetchAll, createMember } = useCrewStore()
  const { scenes, activeSceneId, addDancerAt, renameDancer } = useEditorStore()
  const { features } = usePlan()

  const [quickName, setQuickName] = useState('')
  const [search, setSearch] = useState('')
  const [migrating, setMigrating] = useState(false)
  const [migrated, setMigrated] = useState(false)

  const project = projects.find(p => p.id === projectId)
  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancers = useMemo(() => activeScene?.dancers ?? [], [activeScene])

  // IDs de members ya en la escena activa
  const memberIdsInScene = useMemo(
    () => new Set(dancers.map(d => d.memberId).filter(Boolean)),
    [dancers],
  )

  // ── Migración automática de datos viejos ──────────────────────────────────
  const runMigration = useCallback(async () => {
    if (!project) return
    setMigrating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const oldMembers = project.members ?? []
      if (oldMembers.length === 0) { setMigrating(false); return }

      // Crear miembros globales a partir de los viejos del proyecto
      const nameToId: Record<string, string> = {}
      for (const om of oldMembers) {
        const fullName = [om.name, om.lastName].filter(Boolean).join(' ').trim()
        if (!fullName) continue
        // Verificar si ya existe uno con ese nombre
        const existing = members.find(m =>
          [m.firstName, m.lastName].filter(Boolean).join(' ').toLowerCase() === fullName.toLowerCase(),
        )
        if (existing) {
          nameToId[fullName] = existing.id
          continue
        }
        // Crear nuevo member global
        const { data } = await supabase.from('members').insert({
          owner_id: user.id,
          first_name: om.name,
          last_name: om.lastName || null,
          notes: [om.styles ? `Estilos: ${om.styles}` : '', om.music ? `Música: ${om.music}` : '', om.notes ?? ''].filter(Boolean).join('\n') || null,
          type: 'stage',
        }).select('id').single()
        if (data) nameToId[fullName] = data.id
      }

      // Actualizar dancers en todas las escenas para que apunten al member_id real
      const updatedScenes = project.scenes.map(scene => ({
        ...scene,
        dancers: scene.dancers.map(d => {
          if (d.memberId) return d  // ya tiene member_id, no tocar
          const matchId = nameToId[d.name]
          return matchId ? { ...d, memberId: matchId } : d
        }),
      }))

      // Guardar proyecto sin el JSONB viejo de members
      const updated = { ...project, scenes: updatedScenes, members: [] }
      await saveProject(updated)

      // Recargar members globales
      await fetchAll()
      setMigrated(true)
    } catch (e) {
      console.error('Migration error:', e)
    } finally {
      setMigrating(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, members, saveProject, fetchAll])

  useEffect(() => {
    if (!project || migrating || migrated) return
    const oldMembers = project.members ?? []
    if (oldMembers.length === 0) return
    runMigration()
  }, [project, migrating, migrated, runMigration])

  // ── Quick-add: crea member global + dancer en escena ─────────────────────
  async function quickAdd() {
    const name = quickName.trim()
    if (!name) return
    const parts = name.split(' ')
    const firstName = parts[0]
    const lastName = parts.slice(1).join(' ') || undefined
    await createMember({ firstName, lastName, type: 'stage' })
    await fetchAll()
    setQuickName('')
  }

  // ── Asignar member a la escena (crear dancer o renombrar uno sin member) ─
  function assignToScene(memberId: string, displayName: string) {
    // Buscar un dancer sin member_id para asignarlo
    const unlinked = dancers.find(d => !d.memberId)
    if (unlinked) {
      // Actualizar el dancer existente con memberId y nombre
      renameDancer(unlinked.id, displayName)
      // Hacemos el patch de memberId directamente en el store
      const store = useEditorStore.getState()
      const updatedScenes = store.scenes.map(sc => ({
        ...sc,
        dancers: sc.dancers.map(d =>
          d.id === unlinked.id ? { ...d, memberId, name: displayName } : d,
        ),
      }))
      store.loadScenes(updatedScenes, store.activeSceneId, store.audioMarkers)
    } else {
      // Agregar nuevo dancer centrado con offset determinístico
      const storeState = useEditorStore.getState()
      const offset = (dancers.length % 5) * 40 - 80
      const cx = storeState.stageWidth  / 2 + offset
      const cy = storeState.stageHeight / 2
      addDancerAt(cx, cy, displayName)
      // Asignar memberId al dancer recién creado
      setTimeout(() => {
        const s = useEditorStore.getState()
        const sc = s.scenes.find(x => x.id === s.activeSceneId)
        const last = sc?.dancers[sc.dancers.length - 1]
        if (last && !last.memberId) {
          const updated = s.scenes.map(scene => ({
            ...scene,
            dancers: scene.dancers.map(d =>
              d.id === last.id ? { ...d, memberId } : d,
            ),
          }))
          s.loadScenes(updated, s.activeSceneId, s.audioMarkers)
        }
      }, 50)
    }
  }

  if (!features.membersEnabled) {
    return (
      <div className="absolute top-3 right-3 z-20 w-80 max-w-[calc(100vw-5rem)] bg-negro border border-borde rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] text-dorado uppercase tracking-widest">{t('editor.toolbar.members_panel')}</span>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
        <UpgradeGate requiredPlan="solo_pro" featureName={t('editor.toolbar.members_panel_title')} className="pb-4"
          headline={t('upgrade.members_headline')}
          description={t('upgrade.members_desc')}
          ctaText={t('upgrade.cta_solo_pro')} />
      </div>
    )
  }

  const filtered = members.filter(m => {
    if (!search) return true
    const full = [m.firstName, m.lastName, m.nickname].filter(Boolean).join(' ').toLowerCase()
    return full.includes(search.toLowerCase())
  })

  return (
    <div className="absolute top-3 right-3 z-20 w-80 max-w-[calc(100vw-5rem)] bg-negro border border-borde rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-borde/40 shrink-0">
        <div>
          <span className="text-[10px] text-dorado uppercase tracking-widest">{t('editor.toolbar.members_panel')}</span>
          <p className="text-[10px] text-gris/50 mt-0.5">{members.length} {t('scenes.members_total')} · {memberIdsInScene.size} {t('scenes.in_stage')}</p>
        </div>
        <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
      </div>

      {/* Migración en progreso */}
      {migrating && (
        <div className="px-4 py-3 bg-dorado/10 border-b border-dorado/20 shrink-0">
          <p className="text-[10px] text-dorado">Migrando datos anteriores a la base de integrantes...</p>
        </div>
      )}
      {migrated && (
        <div className="px-4 py-2 bg-green-900/20 border-b border-green-800/30 shrink-0">
          <p className="text-[10px] text-green-400">✓ Integrantes migrados al sistema global</p>
        </div>
      )}

      {/* Quick-add */}
      <div className="px-3 py-2.5 border-b border-borde/40 shrink-0">
        <div className="flex gap-1.5">
          <input
            placeholder="Agregar integrante rápido..."
            value={quickName}
            onChange={e => setQuickName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && quickAdd()}
            className={inputCls}
          />
          <button
            onClick={quickAdd}
            disabled={!quickName.trim()}
            className="px-2.5 py-1 text-xs bg-dorado/15 hover:bg-dorado/25 text-dorado rounded-md border border-dorado/30 disabled:opacity-40 transition-colors shrink-0"
          >+</button>
        </div>
      </div>

      {/* Búsqueda */}
      {members.length > 4 && (
        <div className="px-3 py-2 border-b border-borde/40 shrink-0">
          <input
            placeholder="Buscar..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={inputCls}
          />
        </div>
      )}

      {/* Lista */}
      <div className="overflow-y-auto flex-1">
        {members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <p className="text-gris/40 text-xs">Sin integrantes todavía</p>
          </div>
        )}
        {filtered.map(m => {
          const displayName = [m.firstName, m.lastName].filter(Boolean).join(' ')
          const inScene = memberIdsInScene.has(m.id)
          return (
            <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 border-b border-borde/20 hover:bg-blanco-calido/3 group">
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-blanco-calido/90 truncate">{displayName}</div>
                {m.nickname && <div className="text-[10px] text-dorado/60">"{m.nickname}"</div>}
                {m.level && <div className="text-[9px] text-gris/40 capitalize">{m.level}</div>}
              </div>
              {inScene ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-dorado/10 text-dorado/70 border border-dorado/20 shrink-0">en escena</span>
              ) : (
                <button
                  onClick={() => assignToScene(m.id, displayName)}
                  className="text-[10px] text-gris/40 hover:text-dorado opacity-0 group-hover:opacity-100 transition-all px-1.5 py-0.5 rounded border border-transparent hover:border-dorado/30 shrink-0"
                >
                  + escena
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer link */}
      <div className="px-4 py-2.5 border-t border-borde/40 shrink-0">
        <a href="/integrantes" target="_blank" rel="noopener noreferrer" className="text-[10px] text-gris/40 hover:text-dorado transition-colors">
          Gestionar integrantes → /integrantes ↗
        </a>
      </div>
    </div>
  )
}
