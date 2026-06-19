import { useState } from 'react'
import { useProjectStore } from '@/store/projectStore'
import type { Project } from '@/types'

interface Props {
  project: Project
  onClose: () => void
}

const APP_URL = import.meta.env.VITE_APP_URL ?? window.location.origin

export function ShareModal({ project, onClose }: Props) {
  const { generateShareToken, revokeShareToken, setShareShowNames } = useProjectStore()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [confirmRevoke, setConfirmRevoke] = useState(false)

  const shareUrl = project.shareToken ? `${APP_URL}/share/${project.shareToken}` : null

  async function handleGenerate() {
    setLoading(true)
    try {
      await generateShareToken(project.id)
    } finally {
      setLoading(false)
    }
  }

  async function handleRevoke() {
    setLoading(true)
    try {
      await revokeShareToken(project.id)
      setConfirmRevoke(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleToggleNames(show: boolean) {
    await setShareShowNames(project.id, show)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-negro/70 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-[#1c1c1c] border border-borde rounded-xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-blanco-calido font-medium">Compartir proyecto</h2>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-lg leading-none">×</button>
        </div>

        <div className="space-y-4">
          {/* Toggle mostrar nombres */}
          <div className="flex items-center justify-between py-2 border-b border-borde/50">
            <span className="text-sm text-blanco-calido/80">Mostrar nombres de integrantes</span>
            <button
              onClick={() => handleToggleNames(!(project.shareShowNames ?? true))}
              className={`relative w-10 h-5 rounded-full transition-colors ${
                (project.shareShowNames ?? true) ? 'bg-dorado' : 'bg-borde'
              }`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-negro transition-transform ${
                (project.shareShowNames ?? true) ? 'translate-x-5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {!shareUrl ? (
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full py-2.5 bg-dorado hover:bg-dorado-oscuro text-negro text-sm font-medium rounded-lg
                         transition-colors disabled:opacity-50"
            >
              {loading ? 'Generando...' : 'Generar link compartible'}
            </button>
          ) : (
            <>
              <div>
                <label className="block text-[10px] text-gris uppercase tracking-wider mb-1.5">
                  Link compartible
                </label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={shareUrl}
                    className="flex-1 bg-negro border border-borde rounded-lg px-3 py-2 text-xs text-blanco-calido/70
                               focus:outline-none min-w-0"
                  />
                  <button
                    onClick={handleCopy}
                    className="px-3 py-2 border border-borde rounded-lg text-xs text-gris hover:text-dorado hover:border-dorado/50
                               transition-colors shrink-0"
                  >
                    {copied ? '✓' : 'Copiar'}
                  </button>
                </div>
              </div>

              {!confirmRevoke ? (
                <button
                  onClick={() => setConfirmRevoke(true)}
                  className="w-full py-2 text-xs text-gris/50 hover:text-red-400 transition-colors border border-borde/30 rounded-lg"
                >
                  Revocar link
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmRevoke(false)}
                    className="flex-1 py-2 text-xs text-gris border border-borde rounded-lg hover:text-blanco-calido transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleRevoke}
                    disabled={loading}
                    className="flex-1 py-2 text-xs bg-red-900 hover:bg-red-800 text-red-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? '...' : 'Confirmar revocación'}
                  </button>
                </div>
              )}
            </>
          )}

          <p className="text-[10px] text-gris/40 text-center">
            El link permite ver el proyecto en modo solo lectura, sin necesidad de cuenta.
          </p>
        </div>
      </div>
    </div>
  )
}
