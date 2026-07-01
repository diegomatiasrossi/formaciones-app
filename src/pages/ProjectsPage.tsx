import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { useCrewStore } from '@/store/crewStore'
import { useAuth } from '@/features/auth/useAuth'
import { useEditorStore } from '@/store/editorStore'
import { Modal } from '@/components/ui/Modal'
import { SkeletonGrid } from '@/components/ui/SkeletonCard'
import { OnboardingModal } from '@/components/ui/OnboardingModal'
import { PostCheckoutBanner } from '@/components/ui/PostCheckoutBanner'
import { Logo } from '@/components/ui/Logo'
import { ModuleNav } from '@/components/ui/ModuleNav'
import { toggleLanguage } from '@/i18n'
import { usePlan } from '@/hooks/usePlan'
import { projectSchema, firstErrorKey } from '@/lib/validation'
import { trackEvent } from '@/lib/metaPixel'
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

// Misma figura "i" que CrewMemberShape en el editor: cabeza (círculo) arriba +
// tallo (rectángulo redondeado) abajo. (cx,cy) = centro de la cabeza.
function MiniMember({ cx, cy, r, color }: { cx: number; cy: number; r: number; color: string }) {
  const headR = Math.max(1.2, r * 0.55)
  const stemW = headR * 1.3
  const stemH = headR * 3.0
  const gap   = headR * 0.15
  const stemY = cy + headR + gap
  return (
    <g opacity={0.9}>
      {/* Tallo (cuerpo de la i) */}
      <rect
        x={cx - stemW / 2}
        y={stemY}
        width={stemW}
        height={stemH}
        rx={stemW * 0.15}
        fill={color}
      />
      {/* Cabeza (punto de la i) */}
      <circle cx={cx} cy={cy} r={headR} fill={color} />
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
      <rect x={5} y={4} width={W - 10} height={H - 8} fill="none" stroke="#C9A961" strokeWidth={0.6} strokeDasharray="4,3" rx={2} />
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
  const { projects, loading, fetchProjects, createLocalProject, saveProject, deleteProject, linkProjectToEvent } = useProjectStore()
  const { groups, events, fetchAll, membersOfGroup } = useCrewStore()
  const loadScenes = useEditorStore(s => s.loadScenes)
  const [searchParams, setSearchParams] = useSearchParams()
  const preloadedEventId = searchParams.get('eventId')
  const showCheckoutBanner = searchParams.get('checkout') === 'success'

  // Dispara Purchase una sola vez por sesión de navegador al volver del checkout.
  // La flag en sessionStorage evita el duplicado si el usuario refresca /projects?checkout=success.
  // LIMITACIÓN CONOCIDA: si el mismo usuario hace una segunda compra real en la misma pestaña
  // (ej: upgrade de plan), ese segundo Purchase NO se disparará porque la flag ya está seteada.
  // Para deduplicar con precisión real haría falta un ID de transacción de Stripe, que hoy
  // no está disponible en este punto. Aceptable por ahora — el caso del refresh es el prioritario.
  const PURCHASE_KEY = 'meta_purchase_tracked'
  useEffect(() => {
    if (showCheckoutBanner && !sessionStorage.getItem(PURCHASE_KEY)) {
      trackEvent('Purchase')
      sessionStorage.setItem(PURCHASE_KEY, '1')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function dismissCheckoutBanner() {
    const next = new URLSearchParams(searchParams)
    next.delete('checkout')
    setSearchParams(next, { replace: true })
  }

  const { canCreateProject: canCreate, features } = usePlan()
  const isFreePlan       = features.maxProjects !== Infinity
  const atProjectLimit   = isFreePlan && !canCreate(projects.length)
  const canDeleteProjects = !isFreePlan
  const [showNew, setShowNew] = useState(false)
  const [createError, setCreateError] = useState('')
  const [newName, setNewName] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newChoreographyName, setNewChoreographyName] = useState('')
  const [newStageRatio, setNewStageRatio] = useState<StageRatio>('16:9')
  const [newStageWidth, setNewStageWidth]   = useState('')
  const [newStageHeight, setNewStageHeight] = useState('')
  const [newGroupId, setNewGroupId] = useState('')
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null)
  const [assignEventFor, setAssignEventFor] = useState<Project | null>(null)
  const [search, setSearch] = useState('')
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem('crewficina_onboarded'),
  )

  function closeOnboarding() {
    localStorage.setItem('crewficina_onboarded', '1')
    setShowOnboarding(false)
  }

  useEffect(() => {
    if (user) { fetchProjects(); fetchAll() }
  }, [user, fetchProjects, fetchAll])

  // Si vino con ?eventId= desde Eventos, abrir el modal de creación directo
  useEffect(() => {
    if (preloadedEventId) setShowNew(true)
  }, [preloadedEventId])

  function openProject(project: Project) {
    // Only pre-load scenes when we have full data; lightweight summaries let EditorPage fetch
    if (project._sceneCount === undefined && project.scenes.length) {
      loadScenes(project.scenes, project.activeSceneId, project.audioMarkers)
    }
    navigate(`/editor/${project.id}`)
  }

  const customValid = newStageRatio !== 'custom' || (
    parseFloat(newStageWidth) >= 1 && parseFloat(newStageWidth) <= 50 &&
    parseFloat(newStageHeight) >= 1 && parseFloat(newStageHeight) <= 50
  )

  async function handleCreate() {
    if (!customValid) return
    const name = newName.trim() || t('projects.untitled')
    const parsed = projectSchema.safeParse({ name })
    if (!parsed.success) { setCreateError(t(firstErrorKey(parsed)!)); return }
    setCreateError('')
    const project = createLocalProject({
      name,
      groupName: newGroupName.trim() || undefined,
      choreographyName: newChoreographyName.trim() || undefined,
      stageRatio: newStageRatio,
      stageWidth:  newStageRatio === 'custom' ? parseFloat(newStageWidth)  : null,
      stageHeight: newStageRatio === 'custom' ? parseFloat(newStageHeight) : null,
      startDate: newStartDate || undefined,
      endDate: newEndDate || undefined,
    })
    // Vínculo a grupo/evento
    project.groupId = newGroupId || null
    project.eventId = preloadedEventId || null

    // Si se vinculó a un grupo, traer integrantes "en escena" como dancers iniciales
    if (newGroupId && project.scenes[0]) {
      const allStageMembers = membersOfGroup(newGroupId).filter(m => m.type === 'stage')
      const limit = features.maxDancers === Infinity ? allStageMembers.length : features.maxDancers
      const stageMembers = allStageMembers.slice(0, limit)
      const cx = 400, cy = 280, sp = 50
      project.scenes[0].dancers = stageMembers.map((m, i) => ({
        id: `d_${m.id}_${i}`,
        name: [m.firstName, m.lastName].filter(Boolean).join(' '),
        x: cx + (i - (stageMembers.length - 1) / 2) * sp,
        y: cy,
        color: '#C9A961',
        shape: 'circle' as const,
        size: 14,
        level: 'standing' as const,
        memberId: m.id,
      }))
    }

    await saveProject(project)
    resetForm()
    navigate(`/editor/${project.id}`)
  }

  const filtered = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))
  const totalDancers = (p: Project) => p._dancerCount ?? p.scenes.reduce((sum, s) => sum + s.dancers.length, 0)

  const resetForm = () => {
    setShowNew(false); setNewName(''); setNewGroupName(''); setNewChoreographyName('')
    setNewStageRatio('16:9'); setNewStageWidth(''); setNewStageHeight('')
    setNewGroupId(''); setNewStartDate(''); setNewEndDate('')
  }

  return (
    <div className="min-h-screen bg-crema text-negro">
      {showCheckoutBanner && <PostCheckoutBanner onDismiss={dismissCheckoutBanner} />}
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

      <ModuleNav active="space" />

      {/* Contenido */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold tracking-wide">{t('projects.title')}</h1>
            {projects.length > 0 && !isFreePlan && (
              <p className="text-xs text-gris mt-0.5">{projects.length} proyecto{projects.length !== 1 ? 's' : ''}</p>
            )}
            {isFreePlan && (
              <p className="text-xs text-gris mt-0.5">
                {t('upgrade.free_project_count', { count: projects.length, limit: features.maxProjects })}
              </p>
            )}
            <p className="text-[10px] text-gris/50 mt-0.5">Tus formaciones son personales — no cambian al cambiar de organización.</p>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 3 && (
              <input type="text" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)}
                className="bg-blanco border border-borde-light rounded-lg px-3 py-1.5 text-xs text-negro focus:outline-none focus:border-rojo w-40 placeholder:text-gris/50" />
            )}
            <div className="flex flex-col items-end gap-1">
              <button
                onClick={() => atProjectLimit ? undefined : setShowNew(true)}
                disabled={atProjectLimit}
                title={atProjectLimit ? t('upgrade.free_project_limit_tooltip') : undefined}
                className={clsx(
                  'px-4 py-2 text-blanco text-sm font-semibold rounded-lg shadow-soft transition-all',
                  atProjectLimit
                    ? 'bg-rojo/40 cursor-not-allowed'
                    : 'bg-rojo hover:bg-rojo-oscuro hover:-translate-y-0.5',
                )}
              >
                + {t('projects.new')}
              </button>
              {atProjectLimit && (
                <button onClick={() => navigate('/pricing')} className="text-[10px] text-rojo hover:text-rojo-oscuro underline underline-offset-2 transition-colors">
                  {t('upgrade.free_project_limit_tooltip')}
                </button>
              )}
            </div>
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
            {!search && !atProjectLimit && (
              <button onClick={() => setShowNew(true)}
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
              const sceneCount = project._sceneCount ?? project.scenes.length
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
                    {/* Vínculo a evento */}
                    {events.length > 0 && (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        {project.eventId && events.find(e => e.id === project.eventId) ? (
                          <button
                            onClick={() => setAssignEventFor(project)}
                            className="flex items-center gap-1 text-[10px] text-rojo hover:text-rojo-oscuro transition-colors"
                          >
                            <span>◈</span>
                            <span className="truncate max-w-[140px]">{events.find(e => e.id === project.eventId)!.name}</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => setAssignEventFor(project)}
                            className="text-[10px] text-gris/50 hover:text-rojo transition-colors"
                          >
                            + {t('projects.link_event')}
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex gap-2 mt-auto" onClick={e => e.stopPropagation()}>
                      <button onClick={() => openProject(project)}
                        className="flex-1 text-center py-1.5 text-xs border border-borde-light rounded-lg text-negro/80 hover:border-dorado hover:text-dorado-oscuro transition-colors">
                        {t('projects.open')}
                      </button>
                      {canDeleteProjects && (
                        <button onClick={() => setConfirmDelete(project)}
                          className="w-8 py-1.5 text-xs border border-borde-light rounded-lg text-gris hover:border-rojo/50 hover:text-rojo transition-colors flex items-center justify-center" title="Eliminar">
                          ×
                        </button>
                      )}
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
          {isFreePlan && (
            <div className="flex items-start gap-2.5 px-3 py-2.5 bg-dorado/10 border border-dorado/30 rounded-lg">
              <span className="text-dorado shrink-0 mt-0.5">ℹ</span>
              <p className="text-xs text-dorado-oscuro leading-snug">
                {t('upgrade.free_no_delete')} {t('upgrade.free_no_delete_hint')}
              </p>
            </div>
          )}
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">
              {t('projects.name_placeholder')} <span className="text-rojo">{t('projects.form_required')}</span>
            </label>
            <input autoFocus type="text" value={newName} onChange={e => { setNewName(e.target.value); if (createError) setCreateError('') }}
              onKeyDown={e => e.key === 'Enter' && handleCreate()} placeholder={t('projects.untitled')} maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
            {createError && <p className="text-rojo text-xs mt-1.5">{createError}</p>}
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">{t('projects.form_group')} <span className="text-gris/50">{t('projects.form_optional')}</span></label>
            <input type="text" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Ej: Crew Nexus" maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          </div>
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">{t('projects.form_choreo')} <span className="text-gris/50">{t('projects.form_optional')}</span></label>
            <input type="text" value={newChoreographyName} onChange={e => setNewChoreographyName(e.target.value)} placeholder="Ej: Show fin de año" maxLength={200}
              className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo placeholder:text-gris/50" />
          </div>
          {/* Vincular a grupo — trae integrantes en escena */}
          {groups.length > 0 && (
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">{t('projects.link_group')} <span className="text-gris/50">{t('projects.form_optional')}</span></label>
              <select value={newGroupId} onChange={e => setNewGroupId(e.target.value)}
                className="w-full bg-crema border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo">
                <option value="">—</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {newGroupId && (
                <p className="text-[10px] text-dorado-oscuro mt-1">
                  {membersOfGroup(newGroupId).filter(m => m.type === 'stage').length} {t('projects.members_loaded')}
                </p>
              )}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">{t('projects.form_start')} <span className="text-gris/50">{t('projects.form_optional')}</span></label>
              <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo" />
            </div>
            <div>
              <label className="block text-xs text-gris uppercase tracking-wider mb-1.5">{t('projects.form_end')} <span className="text-gris/50">{t('projects.form_optional')}</span></label>
              <input type="date" value={newEndDate} onChange={e => setNewEndDate(e.target.value)}
                className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo" />
            </div>
          </div>
          {newStartDate && newEndDate && (() => {
            const weeks = Math.max(0, Math.round((new Date(newEndDate).getTime() - new Date(newStartDate).getTime()) / (7 * 24 * 3600 * 1000)))
            return <p className="text-[10px] text-dorado-oscuro -mt-1">{t('projects.weeks_prep_other', { count: weeks })}</p>
          })()}
          <div>
            <label className="block text-xs text-gris uppercase tracking-wider mb-2">{t('projects.stage_ratio')}</label>
            <div className="flex gap-2">
              {([
                { id: '1:1'  as StageRatio, label: '1:1',  titleKey: 'projects.ratio_square',      w: 32, h: 32 },
                { id: '16:9' as StageRatio, label: '16:9', titleKey: 'projects.ratio_horizontal',  w: 48, h: 27 },
                { id: '9:16' as StageRatio, label: '9:16', titleKey: 'projects.ratio_vertical',    w: 24, h: 42 },
              ] as const).map(opt => (
                <button key={opt.id} type="button" onClick={() => setNewStageRatio(opt.id)}
                  className={clsx('flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all',
                    newStageRatio === opt.id ? 'border-rojo bg-rojo/8 text-rojo' : 'border-borde-light text-gris hover:border-gris')}>
                  <svg width={opt.w} height={opt.h} viewBox={`0 0 ${opt.w} ${opt.h}`}>
                    <rect x={1} y={1} width={opt.w - 2} height={opt.h - 2} rx={2} fill="none" stroke={newStageRatio === opt.id ? '#C9343D' : '#bbb'} strokeWidth={1.5} />
                  </svg>
                  <span className="text-[10px] font-mono leading-none">{opt.label}</span>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  <span className="text-[9px] opacity-70">{t(opt.titleKey as any)}</span>
                </button>
              ))}
              {/* Opción Personalizado */}
              <button type="button" onClick={() => setNewStageRatio('custom')}
                className={clsx('flex-1 flex flex-col items-center gap-2 py-3 rounded-lg border transition-all',
                  newStageRatio === 'custom' ? 'border-rojo bg-rojo/8 text-rojo' : 'border-borde-light text-gris hover:border-gris')}>
                <span className="text-lg leading-none">⊞</span>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <span className="text-[9px] opacity-70">{t('projects.ratio_custom' as any)}</span>
              </button>
            </div>

            {/* Inputs de dimensiones — solo si Personalizado */}
            {newStageRatio === 'custom' && (
              <div className="mt-3 space-y-2">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                <p className="text-[10px] text-gris">{t('projects.stage_custom_hint' as any)}</p>
                <div className="flex gap-3">
                  <div className="flex-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <label className="block text-[10px] text-gris uppercase tracking-wider mb-1">{t('projects.stage_width' as any)}</label>
                    <input
                      type="number" step="0.1" min="1" max="50"
                      value={newStageWidth}
                      onChange={e => setNewStageWidth(e.target.value)}
                      placeholder="8.0"
                      className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo"
                    />
                  </div>
                  <div className="flex-1">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    <label className="block text-[10px] text-gris uppercase tracking-wider mb-1">{t('projects.stage_height' as any)}</label>
                    <input
                      type="number" step="0.1" min="1" max="50"
                      value={newStageHeight}
                      onChange={e => setNewStageHeight(e.target.value)}
                      placeholder="6.0"
                      className="w-full bg-crema border border-borde-light rounded-lg px-3 py-2 text-sm text-negro focus:outline-none focus:border-rojo"
                    />
                  </div>
                </div>
                {newStageWidth && newStageHeight && customValid && (
                  <p className="text-[10px] text-dorado-oscuro">
                    Escenario {newStageWidth}m × {newStageHeight}m
                    {' '}· ratio {(parseFloat(newStageWidth) / parseFloat(newStageHeight)).toFixed(2)}:1
                  </p>
                )}
                {newStageWidth && newStageHeight && !customValid && (
                  <p className="text-[10px] text-rojo">Valores entre 1m y 50m</p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-1">
            <button onClick={resetForm} className="px-4 py-2 text-sm text-gris hover:text-negro transition-colors">{t('common.cancel')}</button>
            <button onClick={handleCreate} disabled={!customValid}
              className="px-5 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{t('projects.create_cta')}</button>
          </div>
        </div>
      </Modal>

      {/* Modal eliminar */}
      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title={t('common.delete')}>
        <div className="space-y-4">
          <p className="text-sm text-negro/80">
            {t('projects.delete_confirm')} <strong className="text-negro">{confirmDelete?.name}</strong>?
            <span className="text-gris"> {t('projects.delete_warning')}</span>
          </p>
          <div className="flex gap-3 justify-end">
            <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm text-gris hover:text-negro transition-colors">{t('common.cancel')}</button>
            <button onClick={() => { deleteProject(confirmDelete!.id); setConfirmDelete(null) }}
              className="px-4 py-2 bg-rojo hover:bg-rojo-oscuro text-blanco text-sm font-semibold rounded-lg transition-colors">{t('common.delete')}</button>
          </div>
        </div>
      </Modal>

      {/* Modal — Vincular proyecto a evento */}
      <Modal open={!!assignEventFor} onClose={() => setAssignEventFor(null)} title={t('projects.choose_event')}>
        {events.length === 0 ? (
          <p className="text-sm text-gris py-4 text-center">{t('projects.no_events_to_link')}</p>
        ) : (
          <div className="space-y-2">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {events.map(ev => {
                const isLinked = assignEventFor?.eventId === ev.id
                return (
                  <button
                    key={ev.id}
                    onClick={async () => {
                      if (assignEventFor) {
                        await linkProjectToEvent(assignEventFor.id, isLinked ? null : ev.id)
                      }
                      setAssignEventFor(null)
                    }}
                    className={clsx(
                      'w-full flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                      isLinked
                        ? 'border-rojo bg-rojo/5'
                        : 'border-borde-light hover:border-rojo/40 hover:bg-rojo/3',
                    )}
                  >
                    <span className="text-lg text-rojo shrink-0">◈</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{ev.name}</div>
                      {ev.eventDate && <div className="text-[10px] text-gris">{ev.eventDate}</div>}
                    </div>
                    {isLinked && <span className="text-[10px] text-rojo shrink-0">✓</span>}
                  </button>
                )
              })}
            </div>
            {assignEventFor?.eventId && (
              <button
                onClick={async () => {
                  if (assignEventFor) await linkProjectToEvent(assignEventFor.id, null)
                  setAssignEventFor(null)
                }}
                className="w-full text-center text-xs text-gris hover:text-rojo py-2 transition-colors"
              >
                {t('projects.unlink_event')}
              </button>
            )}
          </div>
        )}
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
