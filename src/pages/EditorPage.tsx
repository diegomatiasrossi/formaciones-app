import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useEditorStore } from '@/store/editorStore'
import { useProjectStore } from '@/store/projectStore'
import { useCrewStore } from '@/store/crewStore'
import { usePlan } from '@/hooks/usePlan'
import { EditorLayout } from '@/features/editor/EditorLayout'
import { Modal } from '@/components/ui/Modal'
import { ShareModal } from '@/components/ui/ShareModal'
import { MobileWarningBanner } from '@/components/ui/MobileWarningBanner'
import { TutorialOverlay, isTutorialDone } from '@/features/tutorial/TutorialOverlay'
import { CreativeQuoteSplash } from '@/components/ui/CreativeQuoteSplash'
import type { Project } from '@/types'

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { projects, saveProject, fetchProjectById } = useProjectStore()
  const { scenes, activeSceneId, audioMarkers, canons, loadScenes } = useEditorStore()
  const hasUnsavedChanges = useEditorStore(s => s.hasUnsavedChanges)
  const { members, fetchAll } = useCrewStore()
  const { features } = usePlan()

  // Cargar integrantes reales para resolver nombres en el canvas
  useEffect(() => { fetchAll() }, [fetchAll])

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach(m => { map[m.id] = [m.firstName, m.lastName].filter(Boolean).join(' ') })
    return map
  }, [members])
  const loaded      = useRef(false)
  const fetchingById = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone())
  const [showSplash, setShowSplash] = useState(true)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [justSaved, setJustSaved] = useState(false)
  const [showExitConfirm, setShowExitConfirm] = useState(false)

  useEffect(() => {
    if (loaded.current) return
    const project = projects.find(p => p.id === projectId)

    // Project not in store or is a lightweight list summary — fetch full data
    if (!project || project._sceneCount !== undefined) {
      if (!fetchingById.current && projectId) {
        fetchingById.current = true
        fetchProjectById(projectId).finally(() => { fetchingById.current = false })
      }
      return
    }

    if (project.scenes.length) {
      loadScenes(project.scenes, project.activeSceneId, project.audioMarkers, project.canons)
      loaded.current = true
    }
  }, [projectId, projects, loadScenes, fetchProjectById])

  // Cierre de pestaña / navegación externa: diálogo nativo del browser solo
  // cuando hay cambios sin guardar. El texto no es personalizable en browsers
  // modernos (comportamiento esperado).
  useEffect(() => {
    if (!hasUnsavedChanges) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  const project = projects.find(p => p.id === projectId)

  // Salida por el botón "← Proyectos": confirmar si hay cambios sin guardar.
  // Leemos el flag VIVO del store con getState() en vez de la variable del
  // render: las mutaciones del canvas vienen de eventos de Konva (fuera del
  // sistema de eventos de React), así que el closure capturado por onBack podía
  // quedar leyendo un render viejo con hasUnsavedChanges=false y navegar directo.
  // getState() devuelve siempre el valor actual, inmune a stale closures/timing.
  //
  // TODO: la navegación interna por React Router (links del menú, atrás del
  // browser) no se intercepta porque unstable_useBlocker requiere un data router
  // (createBrowserRouter) y la app usa <BrowserRouter>. Migrar el router para
  // cubrir ese caso, o el beforeunload cubre el cierre/recarga de pestaña.
  function handleBackRequest() {
    console.log('[DEBUG back] hasUnsavedChanges:', useEditorStore.getState().hasUnsavedChanges)
    if (useEditorStore.getState().hasUnsavedChanges) {
      console.log('[DEBUG modal] showing modal:', useEditorStore.getState().hasUnsavedChanges)
      setShowExitConfirm(true)
    } else {
      navigate('/projects')
    }
  }

  async function handleSave() {
    if (!project || project._sceneCount !== undefined) return
    setIsSaving(true)
    const updated: Project = {
      ...project,
      scenes,
      activeSceneId,
      audioMarkers,
      canons,
      updatedAt: new Date().toISOString(),
    }
    const { error } = await saveProject(updated)
    setIsSaving(false)
    if (error) {
      // The backend trigger (enforce_max_dancers) raises this when a scene
      // exceeds the plan's member limit. Show the same friendly message the
      // Toolbar uses, instead of a raw Postgres error.
      const limit = features.maxDancers === Infinity ? '∞' : features.maxDancers
      setSaveError(
        /plan limit exceeded/i.test(error)
          ? t('plan.member_limit_reached', { limit })
          : error,
      )
    } else {
      setSaveError(null)
      useEditorStore.getState().markSaved()
      setJustSaved(true)
      setTimeout(() => setJustSaved(false), 2000)
    }
  }

  // Autoguardado cada 2 minutos
  useEffect(() => {
    const interval = setInterval(() => {
      if (project) handleSave()
    }, 120_000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, scenes, activeSceneId])

  if (!project) {
    return (
      <div className="min-h-screen bg-negro flex items-center justify-center text-gris text-sm">
        Proyecto no encontrado.{' '}
        <button onClick={() => navigate('/projects')} className="text-dorado ml-2 hover:text-dorado-oscuro">
          Volver a proyectos
        </button>
      </div>
    )
  }

  return (
    <>
      <MobileWarningBanner />
      {showSplash && <CreativeQuoteSplash onDone={() => setShowSplash(false)} />}
      <EditorLayout
        projectName={project.name}
        groupName={project.groupName}
        choreographyName={project.choreographyName}
        stageRatio={project.stageRatio}
        customStageW={project.stageWidth}
        customStageH={project.stageHeight}
        memberNames={(project.members ?? []).map(m => [m.name, m.lastName].filter(Boolean).join(' '))}
        memberNameById={memberNameById}
        onBack={handleBackRequest}
        onSave={handleSave}
        onShare={() => setShowShare(true)}
        isSaving={isSaving}
        justSaved={justSaved}
      />
      {saveError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-[calc(100%-2rem)]
                        bg-negro border border-red-700/60 rounded-lg shadow-card px-4 py-3 flex items-start gap-3">
          <span className="text-red-400 text-sm shrink-0">⚠</span>
          <p className="text-xs text-blanco-calido/90 flex-1">{saveError}</p>
          <button onClick={() => setSaveError(null)} className="text-gris hover:text-blanco-calido text-sm shrink-0">×</button>
        </div>
      )}
      {showShare && (
        <ShareModal project={project} onClose={() => setShowShare(false)} />
      )}
      {showTutorial && (
        <TutorialOverlay onFinish={() => setShowTutorial(false)} />
      )}
      <Modal open={showExitConfirm} onClose={() => setShowExitConfirm(false)} title={t('editor.unsaved_title')}>
        <p className="text-sm text-negro/80 mb-4">{t('editor.unsaved_message')}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={() => setShowExitConfirm(false)} className="px-4 py-2 text-sm text-gris hover:text-negro">
            {t('common.cancel')}
          </button>
          <button
            onClick={() => { setShowExitConfirm(false); navigate('/projects') }}
            className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg"
          >
            {t('editor.unsaved_leave')}
          </button>
        </div>
      </Modal>
    </>
  )
}
