import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useEditorStore } from '@/store/editorStore'
import { useProjectStore } from '@/store/projectStore'
import { useCrewStore } from '@/store/crewStore'
import { EditorLayout } from '@/features/editor/EditorLayout'
import { ShareModal } from '@/components/ui/ShareModal'
import { TutorialOverlay, isTutorialDone } from '@/features/tutorial/TutorialOverlay'
import { CreativeQuoteSplash } from '@/components/ui/CreativeQuoteSplash'
import type { Project } from '@/types'

export function EditorPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { projects, saveProject } = useProjectStore()
  const { scenes, activeSceneId, audioMarkers, loadScenes } = useEditorStore()
  const { members, fetchAll } = useCrewStore()

  // Cargar integrantes reales para resolver nombres en el canvas
  useEffect(() => { fetchAll() }, [fetchAll])

  const memberNameById = useMemo(() => {
    const map: Record<string, string> = {}
    members.forEach(m => { map[m.id] = [m.firstName, m.lastName].filter(Boolean).join(' ') })
    return map
  }, [members])
  const loaded = useRef(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showShare, setShowShare] = useState(false)
  const [showTutorial, setShowTutorial] = useState(() => !isTutorialDone())
  const [showSplash, setShowSplash] = useState(true)

  useEffect(() => {
    if (loaded.current) return
    const project = projects.find(p => p.id === projectId)
    if (project?.scenes.length) {
      loadScenes(project.scenes, project.activeSceneId, project.audioMarkers)
      loaded.current = true
    }
  }, [projectId, projects, loadScenes])

  const project = projects.find(p => p.id === projectId)

  async function handleSave() {
    if (!project) return
    setIsSaving(true)
    const updated: Project = {
      ...project,
      scenes,
      activeSceneId,
      audioMarkers,
      updatedAt: new Date().toISOString(),
    }
    await saveProject(updated)
    setIsSaving(false)
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
        onBack={() => navigate('/projects')}
        onSave={handleSave}
        onShare={() => setShowShare(true)}
        isSaving={isSaving}
      />
      {showShare && (
        <ShareModal project={project} onClose={() => setShowShare(false)} />
      )}
      {showTutorial && (
        <TutorialOverlay onFinish={() => setShowTutorial(false)} />
      )}
    </>
  )
}
