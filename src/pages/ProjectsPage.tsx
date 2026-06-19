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

function MiniMember({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const hr = Math.max(1.5, r * 0.55)
  const bw = r * 0.9
  const bh = r * 1.0
  const by = cy + hr * 0.9
  return (
    <g opacity={0.9}>
      {/* Cuerpo ∧ */}
      <path
        d={`M ${cx - bw} ${by + bh} L ${cx} ${by} L ${cx + bw} ${by + bh}`}
        stroke={color}
        strokeWidth={r * 0.55}
        fill="none"
        strokeLinecap="butt"
        strokeLinejoin="miter"
      />
      {/* Cabeza */}
      <circle cx={cx} cy={cy} r={hr} fill={color} />
    </g>
  )
}

function SceneMiniature({ dancers }: { dancers: { x: number; y: number; color: string; size: number }[] }) {
  const { t } = useTranslation()
  const W = 240; const H = 135
  const sx = W / 800; const sy = H / 560
  if (dancers.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-gris/40 text-xs">{t('projects.no_members_preview')}</span>
      </div>
    )
  }
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="w-full h-full">
      <rect x={5} y={4} width={W - 10} height={H - 8} fill="none" stroke="#B8962E" strokeWidth={0.6} strokeDasharray="4,3" rx={2} />
      {dancers.slice(0, 50).map((d, i) => (
        <MiniMember
          key={i}
          cx={d.x * sx}
          cy={d.y * sy}
          r={Math.max(2.5, d.size * 0.38)}
          color={d.color}
        />
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

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalDancers = (p: Project) => p.scenes.reduce((sum, s) => sum + s.dancers.length, 0)

  const resetForm = () => {
    setShowNew(false); setNewName(''); setNewGroupName(''); setNewChoreographyName('')
    setNewStageRatio('16:9'); setNewStartDate(''); setNewEndDate('')
  }

  return (
    <div className="min-h-screen bg-crema text-negro">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light sticky top-0 z-10 bg-crema/95 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100 transition-opacity">
          <Logo size={28} />
        </button>
        <div className="flex items-center gap-4">
          <button className="text-[10px] text-gris hover:text-negro uppercase tracking-wider transition-colors" onClick={toggleLanguage}>
            {i18n.language === 'es' ? 'EN' : 'ES'}
          </button>
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gris hidden sm:block truncate max-w-[180px]">{user.email}</span>
              <button onClick={signOut} className="text-xs text-gris hover:text-rojo transition-colors">
                {t('auth.sign_out')}
              </button>
            </div>
          ) : (
            <button onClick={() => navigate('/login')} className="text-xs text-rojo hover:text-rojo-oscuro transition-colors">
              {t('auth.sign_in')}
            </button>
          )}
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t('projects.title')}</h1>
            {projects.length > 0 && (
              <p className="text-xs text-gris mt-0.5">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 3 && (
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                className="bg-blanco border border-borde-light rounded-lg px-3 py-1.5 text-xs text-negro focus:outline-none focus:border-rojo w-40 placeholder:text-gris/50" />
            )}
            <button
              onClick={() => canCreate(projects.length) ? setShowNew(true) : navigate('/pricing')}
              className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-all hover:-translate-y-0.5 shadow-soft">
              + {t('projects.new')}
            </button>
          </div>
        </div>

        {loading && <SkeletonGrid count={6} />}

        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl border border-borde-light bg-blanco flex items-center justify-center mb-6 text-2xl text-dorado">⬡</div>
            <h2 className="text-base font-semibold text-negro mb-2">
              {search ? 'Sin resultados' : t('projects.no_projects')}
            </h2>
            <p className="text-xs text-gris mb-6 max-w-xs">
              {search ? `No hay proyectos que coincidan con "${search}"` : 'Creá tu primer proyecto y empezá a diseñar formaciones'}
            </p>
            {!search && (
              <button onClick={() => canCreate(projects.length) ? setShowNew(true) : navigate('/pricing')}
                className="px-5 py-2.5 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">
                {t('projects.create_first')}
              </button>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(project => {
              const dancers = totalDancers(project)
              const sceneCount = project.scenes.length
              return (
                <div key={project.id}
                  className={clsx('bg-blanco border border-borde-light rounded-2xl flex flex-col overflow-hidden shadow-soft',
                    'hover:border-dorado/50 hover:shadow-card transition-all group cursor-pointer hover:-translate-y-0.5')}
                  onClick={() => openProject(project)}>
                  {/* Miniatura (escenario oscuro) */}
                  <div className="w-full aspect-video bg-[#0e0e0e] overflow-hidden relative">
                    <SceneMiniature dancers={project.scenes[0]?.dancers ?? []} />
                    {sceneCount > 1 && (
                      <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-negro/80 rounded text-[9px] text-crema/70 border border-[#333]">
                        +{sceneCount - 1} escena{sceneCount > 2 ? 's' : ''}
                      </div>
                    )}
                  </div>
                  <div className="p-4 flex flex-col gap-3 flex-1">
                    <div>
                      <div className="font-semibold text-sm text-negro group-hover:text-rojo transition-colors line-clamp-1">{project.name}</div>
                      {(project.groupName || project.choreographyName) && (
                        <div className="text-[10px] text-gris mt-0.5 line-clamp-1">
                          {[project.groupName, project.choreographyName].filter(Boolean).join(' · ')}
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-gris">{relativeTime(project.updatedAt)}</span>
                        {dancers > 0 && (<><span className="text-gris/40">·</span><span className="text-[10px] text-gris">{dancers} int.</span></>)}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      <Badge>{sceneCount} escena{sceneCount !== 1 ? 's' : ''}</Badge>
                      {project.scenes[0]?.formationName && <Badge accent>{project.scenes[0].formationName}</Badge>}
                    </div>
                    <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openProject(project)}
                        className="flex-1 text-center py-1.5 text-xs border border-borde-light rounded-lg text-negro/80 hover:border-dorado hover:text-dorado-oscuro transition-colors">
                        {t('projects.open')}
                      </button>
                      <button onClick={() => setConfirmDelete(project)}
                        className="w-8 py-1.5 text-xs border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo transition-colors flex items-center justify-center" title="Eliminar">
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

      {/* Onboarding */}
      <OnboardingModal open={showOnboarding} onClose={closeOnboarding} />

      {/* Modal nuevo proyecto */}
      <Modal open={showNew} onClose={resetForm} title={t('projects.new')}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
              Nombre del proyecto <span className="text-rojo">*</span>
            </label>
            <input autoFocus type="text" value={newName} onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder={t('projects.untitled')} maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">Grupo / Crew <span className="text-gris/50">(opcional)</span></label>
            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ej: Crew Nexus" maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">Nombre de la coreografía <span className="text-gris/50">(opcional)</span></label>
            <input type="text" value={newChoreographyName} onChange={e => setNewChoreographyName(e.target.value)} placeholder="Ej: Show fin de año" maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">Fecha inicio <span className="text-gris/50">(opcional)</span></label>
              <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo" />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">Fecha evento <span className="text-gris/50">(opcional)</span></label>
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo" />
            </div>
          </div>
          {newStartDate && newEndDate && (() => {
            const weeks = Math.max(0, Math.round((new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (7 * 24 * 3600 * 1000)))
            return <p className="text-[10px] text-dorado-oscuro -mt-1">{weeks} semana{weeks !== 1 ? 's' : ''} de preparación</p>
          })()}
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-2">Proporción del escenario</label>
            <div className="flex gap-2">
              {([
                { id: '1:1'  as StageRatio, label: '1:1',  title: 'Cuadrado',   w: 32, h: 32 },
                { id: '16:9' as StageRatio, label: '16:9', title: 'Horizontal', w: 48, h: 27 },
                { id: '9:16' as StageRatio, label: '9:16', title: 'Vertical',   w: 24, h: 42 },
              ] as const).map(opt => (
                <button key={opt.id} type="button" onClick={() => setNewStageRatio(opt.id)}
                  className={clsx('flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all',
                    newStageRatio === opt.id ? 'border-rojo bg-rojo/8 text-rojo' : 'border-borde-light text-gris hover:border-gris')}>
                  <svg width={opt.w} height={opt.h} viewBox={`0 0 ${opt.w} ${opt.h}`}>
                    <rect x={1} y={1} width={opt.w - 2} height={opt.h - 2} rx={2} fill="none" stroke={newStageRatio === opt.id ? '#C9343D' : '#bbb'} strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-mono leading-none">{opt.label}</span>
                  <span className="text-[9px] opacity-70">{opt.title}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gris hover:text-negro transition-colors">{t('common.cancel')}</button>
            <button onClick={handleCreate} className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">Crear →</button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Eliminar proyecto">
        <div className="space-y-4">
          <p className="text-sm text-negro/80">
            ¿Eliminar <strong className="text-negro">{confirmDelete?.name}</strong>?
            <span className="text-gris"> Esta acción no se puede deshacer.</span>
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro transition-colors">{t('common.cancel')}</button>
            <button onClick={() => { deleteProject(confirmDelete!.id); setConfirmDelete(null) }}
              className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">Eliminar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Badge({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded text-[9px] border',
      accent ? 'border-dorado/40 text-dorado-oscuro bg-dorado/8' : 'border-borde-light text-gris')}>
      {children}
    </span>
  )
}
