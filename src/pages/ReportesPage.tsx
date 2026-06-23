import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useProjectStore } from '@/store/projectStore'
import { useAuth } from '@/features/auth/useAuth'
import { usePlan } from '@/hooks/usePlan'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import { ModuleNav } from '@/components/ui/ModuleNav'
import { Logo } from '@/components/ui/Logo'
import { toggleLanguage } from '@/i18n'
import { calcProjectSymmetry } from '@/lib/symmetry'
import type { Project } from '@/types'

// ── Gauge SVG ─────────────────────────────────────────────────────────────────
const R = 60
const CX = 80
const CY = 80
const CIRC = Math.PI * R
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`

function SymmetryGauge({ pct }: { pct: number }) {
  const filled = Math.max(0, Math.min(pct / 100, 1)) * CIRC
  return (
    <svg width="160" height="92" viewBox="0 0 160 92" aria-hidden="true">
      <path d={ARC} fill="none" stroke="#2a2a2a" strokeWidth="13" strokeLinecap="round" />
      <path d={ARC} fill="none" stroke="#C9A961" strokeWidth="13" strokeLinecap="round"
        strokeDasharray={`${filled} ${CIRC}`} />
    </svg>
  )
}

// ── Scene bar ──────────────────────────────────────────────────────────────────
function SceneBar({ name, pct, empty }: { name: string; pct: number; empty: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gris/80 w-28 shrink-0 truncate">{name}</span>
      {empty ? (
        <span className="text-[10px] text-gris/40 italic">{t('reports.scene_empty')}</span>
      ) : (
        <>
          <div className="flex-1 h-2 bg-[#2a2a2a] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: '#C9A961' }}
            />
          </div>
          <span className="text-xs text-dorado tabular-nums w-10 text-right shrink-0">{pct}%</span>
        </>
      )}
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export function ReportesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const { can } = usePlan()
  const { projects, fetchProjects, fetchProjectById } = useProjectStore()
  const [selectedId, setSelectedId] = useState('')
  const [fullProject, setFullProject] = useState<Project | null>(null)
  const [loadingProject, setLoadingProject] = useState(false)

  useEffect(() => {
    if (user) fetchProjects()
  }, [user, fetchProjects])

  async function handleSelect(id: string) {
    setSelectedId(id)
    if (!id) { setFullProject(null); return }
    setLoadingProject(true)
    const p = await fetchProjectById(id)
    setFullProject(p)
    setLoadingProject(false)
  }

  const scenes = fullProject?.scenes ?? []
  const { overall, perScene } = calcProjectSymmetry(scenes, fullProject?.stageWidth, fullProject?.stageHeight)

  return (
    <div className="min-h-screen bg-crema text-negro">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-borde-light sticky top-0 z-10 bg-crema/95 backdrop-blur-sm">
        <button onClick={() => navigate('/')} className="opacity-90 hover:opacity-100 transition-opacity">
          <Logo size={28} />
        </button>
        <div className="flex items-center gap-4">
          <button
            className="text-[10px] text-gris hover:text-negro uppercase tracking-wider transition-colors"
            onClick={toggleLanguage}
          >
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

      <ModuleNav active="reports" />

      {!can('reportsEnabled') && (
        <div className="max-w-2xl mx-auto px-6 py-16 flex justify-center">
          <div className="bg-blanco border border-borde-light rounded-2xl p-10 shadow-soft">
            <UpgradeGate requiredPlan="solo_pro" featureName={t('reports.title')}
              headline={t('upgrade.reports_headline')}
              description={t('upgrade.reports_desc')}
              ctaText={t('upgrade.cta_solo_pro')}
              lightBg />
          </div>
        </div>
      )}

      {can('reportsEnabled') && <main className="max-w-2xl mx-auto px-6 py-10 space-y-8">
        {/* Title + selector */}
        <div className="space-y-4">
          <h1 className="text-xl font-semibold tracking-wide">{t('reports.title')}</h1>
          <select
            value={selectedId}
            onChange={e => handleSelect(e.target.value)}
            className="w-full bg-blanco border border-borde-light rounded-lg px-4 py-2.5 text-sm text-negro focus:outline-none focus:border-rojo"
          >
            <option value="">{t('reports.select_project')}</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* Loading */}
        {loadingProject && (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Results */}
        {!loadingProject && fullProject && (
          <div className="space-y-8">
            {/* Gauge card */}
            <div className="bg-negro rounded-2xl p-8 flex flex-col items-center gap-2 shadow-card">
              <p className="text-[10px] text-dorado/70 uppercase tracking-widest mb-2">
                {t('reports.symmetry_title')}
              </p>
              <div className="relative flex flex-col items-center">
                <SymmetryGauge pct={overall} />
                <div className="text-5xl font-bold text-[#f5f5f0] tabular-nums -mt-2">{overall}%</div>
              </div>

              {/* Explanation */}
              <p className="text-xs text-gris/70 text-center leading-relaxed max-w-sm mt-4">
                {t('reports.symmetry_explanation')}
              </p>
            </div>

            {/* By-scene breakdown */}
            {scenes.length > 0 && (
              <div className="bg-blanco border border-borde-light rounded-2xl p-6 space-y-4 shadow-soft">
                <p className="text-[10px] text-gris/50 uppercase tracking-widest">{t('reports.by_scene')}</p>
                <div className="space-y-3">
                  {scenes.map((scene, i) => (
                    <SceneBar
                      key={scene.id}
                      name={scene.formationName ? `${scene.name} — ${scene.formationName}` : scene.name}
                      pct={perScene[i] ?? 0}
                      empty={scene.dancers.length === 0}
                    />
                  ))}
                </div>
              </div>
            )}

            {scenes.length === 0 && (
              <p className="text-sm text-gris text-center py-8">{t('reports.no_scenes')}</p>
            )}
          </div>
        )}
      </main>}
    </div>
  )
}
