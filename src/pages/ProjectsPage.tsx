import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { useAuth } from '@/features/auth/useAuth'
import { useEditorStore } from '@/store/editorStore'
import { Modal } from '@/components/ui/Modal'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { OnboardingModal } from '@/components/ui/OnboardingModal'
import { Logo } from '@/components/ui/Logo'
import { toggleLanguage } from '@/i18n'
import { usePlan } from '@/hooks/usePlan'
import type { Project, StageRatio } from '@/types'
import clsx from 'clsx'

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  const hrs  = Math.floor(diff / 3_600_000)
  const days = Math.floor(diff / 86_400_000)
  if (mins < 1)  return 'hace un momento'
  if (mins < 60) return `hace ${mins} min`
  if (hrs  < 24) return `hace ${hrs}h`
  return `hace ${days} día${days > 1 ? 's' : ''}`
}

function SceneMiniature({ dancers }: { dancers: { x: number; y: number; color: string; size: number }[] }) {
  const W = 240; const H = 135
  const sx = W / 800; const sy = H / 560
  if (dancers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gris/30 text-xs">Sin bailarines</span>
      </div>
    )
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <rect x={5} y={4} width={W - 10} height={H - 8}
        fill="none" stroke="#C9A961" strokeWidth={0.6} strokeDasharray="4,3" rx={2} />
      {dancers.slice(0, 50).map((d, i) => (
        <circle key={i} cx={d.x * sx} cy={d.y * sy} r={Math.max(2, d.size * 0.4)}
          fill={d.color} opacity={0.8} />
      ))}
    </svg>
  )
}

export function ProjectsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { projects, loading, fetchProjects, createLocalProject, saveProject, deleteProject } = useProjectStore()
  const loadScenes = useEditorStore(s => s.loadScenes)

  const { canCreateProject: canCreate } = usePlan()
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newChoreographyName, setNewChoreographyName] = useState('')
  const [newStageRatio, setNewStageRatio] = useState<StageRatio>('16:9')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('crewficina_onboarded'),
  )

  function closeOnboarding() {
    localStorage.setItem('crewficina_onboarded', '1')
    setShowOnboarding(false)
  }

  useEffect(() => {
    if (user) fetchProjects()
  }, [user, fetchProjects])

  function openProject(project: Project) {
    loadScenes(project.scenes, project.activeSceneId, project.audioMarkers)
    navigate(`/editor/${project.id}`)
  }

  async function handleCreate() {
    const name = newName.trim() || t('projects.untitled')
    const project = createLocalProject({
      name,
      groupName: newGroupName.trim() || undefined,
      choreographyName: newChoreographyName.trim() || undefined,
      stageRatio: newStageRatio,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
    })
    await saveProject(project)
    setShowNew(false)
    setNewName('')
    setNewGroupName('')
    setNewChoreographyName('')
    setNewStageRatio('16:9')
    setNewStartDate('')
    setNewEndDate('')
    navigate(`/editor/${project.id}`)
  }

  const filtered = projects.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  )

  const totalDancers = (p: Project) =>
    p.scenes.reduce((sum, s) => sum + s.dancers.length, 0)

  return (
    <div className="min-h-screen bg-negro text-blanco-calido">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde/60 sticky top-0 z-10 bg-negro/95 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="group opacity-90 hover:opacity-100 transition-opacity">
          <Logo size={28} light />
        </button>
        <div className="flex items-center gap-4">
          <button
            className="text-[10px] text-gris hover:text-dorado uppercase tracking-wider transition-colors"
            onClick={toggleLanguage}
          >
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gris hidden sm:block truncate max-w-[180px]">{user.email}</span>
              <button
                onClick={signOut}
                className="text-xs text-gris hover:text-red-400 transition-colors"
              >
                {t('auth.sign_out')}
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="text-xs text-dorado hover:text-dorado-oscuro transition-colors"
            >
              {t('auth.sign_in')}
            </button>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* Título + acciones */}
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-light tracking-wide">{t('projects.title')}</h1>
            {projects.length > 0 && (
              <p className="text-xs text-gris/60 mt-0.5">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 3 && (
              <input
                type="text"
                placeholder="Buscar..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent border border-borde rounded-lg px-3 py-1.5 text-xs text-blanco-calido
                           focus:outline-none focus:border-dorado/60 w-40 placeholder:text-gris/40"
              />
            )}
            <button
              onClick={() => {
                if (!canCreate(projects.length)) {
                  navigate('/pricing')
                } else {
                  setShowNew(true)
                }
              }}
              className="px-4 py-2 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium
                         rounded-lg transition-all hover:-translate-y-0.5 shadow-md shadow-dorado/20"
            >
              + {t('projects.new')}
            </button>
          </div>
        </div>

        {/* Estado de carga */}
        {loading && <SkeletonGrid count={6} />}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde/50 bg-[#111] flex items-center justify-center mb-6 text-2xl text-dorado/40">
              ⬡
            </div>
            <h2 className="text-base font-medium text-blanco-calido/80 mb-2">
              {search ? 'Sin resultados' : t('projects.no_projects')}
            </h2>
            <p className="text-xs text-gris/50 mb-6 max-w-xs">
              {search
                ? `No hay proyectos que coincidan con "${search}"`
                : 'Creá tu primer proyecto y empezá a diseñar formaciones'
              }
            </p>
            {!search && (
              <button
                onClick={() => canCreate(projects.length) ? setShowNew(true) : navigate('/pricing')}
                className="px-5 py-2.5 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium rounded-lg transition-colors"
              >
                {t('projects.create_first')}
              </button>
            )}
          </div>
        )}

        {/* Grid de proyectos */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => {
              const dancers = totalDancers(project)
              const sceneCount = project.scenes.length
              return (
                <div
                  key={project.id}
                  className={clsx(
                    'bg-[#0f0f0f] border border-borde/60 rounded-2xl flex flex-col overflow-hidden',
                    'hover:border-dorado/30 transition-all group cursor-pointer hover:-translate-y-0.5',
                  )}
                  onClick={() => openProject(project)}
                >
                  {/* Miniatura */}
                  <div className="w-full aspect-video bg-[#0a0a0a] overflow-hidden relative">
                    <SceneMiniature dancers={project.scenes[0]?.dancers ?? []} />
                    {sceneCount > 1 && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-negro/80 rounded text-[9px] text-gris/70 border border-borde/40">
                        +{sceneCount - 1} escena{sceneCount > 2 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <div className="font-medium text-sm text-blanco-calido group-hover:text-dorado transition-colors line-clamp-1">
                        {project.name}
                      </div>
                      {(project.groupName || project.choreographyName) && (
                        <div className="text-[10px] text-gris/50 mt-0.5 line-clamp-1">
                          {[project.groupName, project.choreographyName].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gris/50">{relativeTime(project.updatedAt)}</span>
                        {dancers > 0 && (
                          <>
                            <span className="text-gris/30">·</span>
                            <span className="text-[10px] text-gris/50">{dancers} bail.</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Badges */}
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge>{sceneCount} escena{sceneCount !== 1 ? 's' : ''}</Badge>
                      {project.scenes[0]?.formationName && (
                        <Badge accent>{project.scenes[0].formationName}</Badge>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => openProject(project)}
                        className="flex-1 text-center py-1.5 text-xs border border-borde/60 rounded-lg
                                   text-blanco-calido/80 hover:border-dorado/50 hover:text-dorado transition-colors"
                      >
                        {t('projects.open')}
                      </button>
                      <button
                        onClick={() => setConfirmDelete(project)}
                        className="w-8 py-1.5 text-xs border border-borde/60 rounded-lg text-gris/50
                                   hover:border-red-800/60 hover:text-red-400 transition-colors flex items-center justify-center"
                        title="Eliminar"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal: nuevo proyecto */}
      <Modal open={showNew} onClose={() => { setShowNew(false); setNewName(''); setNewGroupName(''); setNewChoreographyName(''); setNewStageRatio('16:9'); setNewStartDate(''); setNewEndDate('') }} title={t('projects.new')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
              Nombre del proyecto <span className="text-dorado/60">*</span>
            </label>
            <input
              autoFocus
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder={t('projects.untitled')}
              maxLength={200}
              className="w-full bg-negro border border-borde rounded-lg px-4 py-2.5 text-sm text-blanco-calido
                         focus:outline-none focus:border-dorado placeholder:text-gris/40"
            />
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
              Grupo / Compañía <span className="text-gris/40">(opcional)</span>
            </label>
            <input
              type="text"
              value={newGroupName}
              onChange={e => setNewGroupName(e.target.value)}
              placeholder="Ej: Ballet Municipal de Córdoba"
              maxLength={200}
              className="w-full bg-negro border border-borde rounded-lg px-4 py-2.5 text-sm text-blanco-calido
                         focus:outline-none focus:border-dorado placeholder:text-gris/40"
            />
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
              Nombre de la coreografía <span className="text-gris/40">(opcional)</span>
            </label>
            <input
              type="text"
              value={newChoreographyName}
              onChange={e => setNewChoreographyName(e.target.value)}
              placeholder="Ej: Acto II - Vals de los cisnes"
              maxLength={200}
              className="w-full bg-negro border border-borde rounded-lg px-4 py-2.5 text-sm text-blanco-calido
                         focus:outline-none focus:border-dorado placeholder:text-gris/40"
            />
          </div>
          {/* Fechas del proyecto */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
                Fecha inicio <span className="text-gris/40">(opcional)</span>
              </label>
              <input
                type="date"
                value={newStartDate}
                onChange={e => setNewStartDate(e.target.value)}
                className="w-full bg-negro border border-borde rounded-lg px-3 py-2.5 text-sm text-blanco-calido
                           focus:outline-none focus:border-dorado placeholder:text-gris/40"
              />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
                Fecha evento <span className="text-gris/40">(opcional)</span>
              </label>
              <input
                type="date"
                value={newEndDate}
                onChange={e => setNewEndDate(e.target.value)}
                className="w-full bg-negro border border-borde rounded-lg px-3 py-2.5 text-sm text-blanco-calido
                           focus:outline-none focus:border-dorado placeholder:text-gris/40"
              />
            </div>
          </div>
          {newStartDate && newEndDate && (() => {
            const weeks = Math.max(0, Math.round(
              (new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (7 * 24 * 3600 * 1000)
            ))
            return (
              <p className="text-[10px] text-dorado/70 -mt-1">
                {weeks} semana{weeks !== 1 ? 's' : ''} de preparación
              </p>
            )
          })()}

          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-2">
              Proporción del escenario
            </label>
            <div className="flex gap-2">
              {([
                { id: '1:1'  as StageRatio, label: '1:1',  title: 'Cuadrado',    w: 32, h: 32 },
                { id: '16:9' as StageRatio, label: '16:9', title: 'Horizontal',  w: 48, h: 27 },
                { id: '9:16' as StageRatio, label: '9:16', title: 'Vertical',    w: 24, h: 42 },
              ] as const).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setNewStageRatio(opt.id)}
                  className={clsx(
                    'flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all',
                    newStageRatio === opt.id
                      ? 'border-dorado bg-dorado/10 text-dorado'
                      : 'border-borde/60 text-gris/60 hover:border-borde',
                  )}
                >
                  <svg width={opt.w} height={opt.h} viewBox={`0 0 ${opt.w} ${opt.h}`}>
                    <rect x={1} y={1} width={opt.w - 2} height={opt.h - 2}
                      rx={2} fill="none"
                      stroke={newStageRatio === opt.id ? '#C9A961' : '#555'}
                      strokeWidth={1.5}
                    />
                  </svg>
                  <span className="text-[10px] font-mono leading-none">{opt.label}</span>
                  <span className="text-[9px] opacity-70">{opt.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={() => { setShowNew(false); setNewName(''); setNewGroupName(''); setNewChoreographyName(''); setNewStageRatio('16:9'); setNewStartDate(''); setNewEndDate('') }}
              className="px-4 py-2 text-sm text-gris hover:text-blanco-calido transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium rounded-lg transition-colors"
            >
              Crear →
            </button>
          </div>
        </div>
      </Modal>

      {/* Onboarding */}
      <OnboardingModal open={showOnboarding} onClose={closeOnboarding} />

      {/* Modal: confirmar eliminación */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar proyecto">
        <div className="space-y-4">
          <p className="text-sm text-blanco-calido/80">
            ¿Eliminar <strong className="text-blanco-calido">{confirmDelete?.name}</strong>?
            <span className="text-gris/50"> Esta acción no se puede deshacer.</span>
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setConfirmDelete(null)}
              className="px-4 py-2 text-sm text-gris hover:text-blanco-calido transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => { deleteProject(confirmDelete!.id); setConfirmDelete(null) }}
              className="px-4 py-2 bg-red-900 hover:bg-red-800 text-red-100 text-sm font-medium rounded-lg transition-colors"
            >
              Eliminar
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={clsx(
      'px-2 py-0.5 rounded text-[9px] border',
      accent
        ? 'border-dorado/30 text-dorado/70 bg-dorado/5'
        : 'border-borde/40 text-gris/50',
    )}>
      {children}
    </span>
  )
}
