import { useMemo } from 'react'
import { useEditorStore } from '@/store/editorStore'
import type { DancerLevel } from '@/types'
import { LEVEL_META } from '@/types'
import { UpgradeGate } from '@/components/ui/UpgradeGate'
import clsx from 'clsx'

const ZONE_LABELS = [
  'F.Izq', 'F.Cen', 'F.Der',
  'C.Izq', 'Centro', 'C.Der',
  'Fr.Izq', 'Fr.Cen', 'Fr.Der',
]
const LEVEL_COLORS: Record<DancerLevel, string> = {
  floor: '#64748b', mid: '#7c9b5a', standing: '#C9A961', aerial: '#f472b6',
}

interface Props { onClose: () => void; locked?: boolean }

export function StatisticsPanel({ onClose, locked }: Props) {
  if (locked) {
    return (
      <div className="absolute top-3 left-3 z-20 w-64 bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <span className="text-[10px] text-dorado uppercase tracking-widest">Estadísticas</span>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>
        <UpgradeGate requiredPlan="studio" featureName="Estadísticas y mapa de zonas" className="pb-4" />
      </div>
    )
  }
  const { scenes, activeSceneId, stageWidth, stageHeight } = useEditorStore()
  const allScenes = scenes
  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancers = activeScene?.dancers ?? []

  // ── Zona heatmap 3×3 ─────────────────────────────────────────────
  const PADDING = 40
  const sw = stageWidth - PADDING * 2
  const sh = stageHeight - PADDING * 2
  const sx = PADDING
  const sy = PADDING

  const zoneCount = useMemo(() => {
    const counts = new Array(9).fill(0)
    dancers.forEach(d => {
      const col = Math.min(2, Math.max(0, Math.floor((d.x - sx) / (sw / 3))))
      const row = Math.min(2, Math.max(0, Math.floor((d.y - sy) / (sh / 3))))
      if (d.x >= sx && d.x <= sx + sw && d.y >= sy && d.y <= sy + sh)
        counts[row * 3 + col]++
    })
    return counts
  }, [dancers, sx, sy, sw, sh])

  const maxZone = Math.max(...zoneCount, 1)

  // ── Distribución de niveles ───────────────────────────────────────
  const levelDist = useMemo(() => {
    const counts: Record<DancerLevel, number> = { floor: 0, mid: 0, standing: 0, aerial: 0 }
    dancers.forEach(d => counts[d.level]++)
    return counts
  }, [dancers])

  // ── Colores más usados ───────────────────────────────────────────
  const colorFreq = useMemo(() => {
    const map = new Map<string, number>()
    dancers.forEach(d => map.set(d.color, (map.get(d.color) ?? 0) + 1))
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [dancers])

  // ── Escena con más bailarines ─────────────────────────────────────
  const busiest = useMemo(() => {
    return allScenes.reduce((best, sc) =>
      sc.dancers.length > best.dancers.length ? sc : best,
    allScenes[0])
  }, [allScenes])

  // ── Densidad del espacio ──────────────────────────────────────────
  const density = dancers.length === 0 ? 0 : Math.min(100, Math.round((dancers.length / 50) * 100))

  if (dancers.length === 0) {
    return (
      <div className="absolute top-3 left-3 z-20 w-64 bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl p-5">
        <PanelHeader onClose={onClose} />
        <p className="text-gris text-xs text-center mt-4">No hay bailarines en esta escena.</p>
      </div>
    )
  }

  return (
    <div className="absolute top-3 left-3 z-20 w-72 bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl p-4 max-h-[calc(100vh-120px)] overflow-y-auto">
      <PanelHeader onClose={onClose} />

      {/* Contador general */}
      <div className="flex gap-2 mb-4">
        <Stat value={dancers.length} label="Bailarines" color="text-dorado" />
        <Stat value={allScenes.length} label="Escenas" color="text-blanco-calido/70" />
        <Stat value={`${density}%`} label="Densidad" color={density > 80 ? 'text-red-400' : 'text-green-400'} />
      </div>

      {/* Heatmap 3×3 */}
      <Section title="Mapa de zonas">
        <div className="grid grid-cols-3 gap-1">
          {zoneCount.map((count, i) => {
            const intensity = count / maxZone
            return (
              <div
                key={i}
                className="relative rounded-md flex flex-col items-center justify-center py-2 text-[10px] border border-borde/30 transition-colors"
                style={{ backgroundColor: `rgba(201,169,97,${intensity * 0.35 + 0.03})` }}
              >
                <span className="text-blanco-calido/90 font-semibold text-xs">{count}</span>
                <span className="text-gris/60 leading-none">{ZONE_LABELS[i]}</span>
              </div>
            )
          })}
        </div>
        <p className="text-[10px] text-gris/50 mt-1.5 text-center">Fondo → Frente (vista de planta)</p>
      </Section>

      {/* Niveles */}
      <Section title="Distribución de niveles">
        <div className="space-y-1.5">
          {(Object.entries(levelDist) as [DancerLevel, number][]).map(([lv, count]) => (
            <div key={lv} className="flex items-center gap-2">
              <span className="text-[10px] text-gris w-16 shrink-0">{LEVEL_META[lv].emoji} {LEVEL_META[lv].label}</span>
              <div className="flex-1 h-3 bg-borde/40 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: dancers.length ? `${(count / dancers.length) * 100}%` : '0%',
                    backgroundColor: LEVEL_COLORS[lv],
                  }}
                />
              </div>
              <span className="text-[10px] text-gris tabular-nums w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* Colores del grupo */}
      {colorFreq.length > 0 && (
        <Section title="Paleta del grupo">
          <div className="flex flex-wrap gap-2 items-center">
            {colorFreq.map(([color, count]) => (
              <div key={color} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-6 h-6 rounded-full border border-borde/40 shrink-0"
                  style={{ backgroundColor: color }}
                  title={color}
                />
                <span className="text-[9px] text-gris/60">{count}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Escena más compleja */}
      {allScenes.length > 1 && (
        <Section title="Escena más ocupada">
          <div className="flex items-center justify-between">
            <span className="text-xs text-blanco-calido/80 truncate">{busiest.name}</span>
            <span className="text-xs text-dorado tabular-nums shrink-0">{busiest.dancers.length} bail.</span>
          </div>
        </Section>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────

function PanelHeader({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="text-[10px] text-dorado uppercase tracking-widest">Estadísticas</span>
      <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
    </div>
  )
}

function Stat({ value, label, color }: { value: string | number; label: string; color: string }) {
  return (
    <div className="flex-1 bg-negro/60 rounded-lg border border-borde/40 p-2 text-center">
      <div className={clsx('text-lg font-bold tabular-nums leading-none', color)}>{value}</div>
      <div className="text-[9px] text-gris/60 mt-0.5">{label}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 last:mb-0">
      <div className="text-[9px] text-gris/50 uppercase tracking-widest mb-2">{title}</div>
      {children}
    </div>
  )
}
