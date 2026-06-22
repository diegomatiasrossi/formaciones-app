import { useCallback, useEffect, useRef, useState } from 'react'
import { useEditorStore } from '@/store/editorStore'

interface Step {
  id: string
  title: string
  text: string
  targetSelector: string | null
  action: 'click-next' | 'click-finish' | 'wait-dancer-click' | 'wait-drag' | 'wait-formation' | 'wait-multi-select' | 'wait-color' | 'wait-scene' | 'wait-dup-scene' | 'wait-preview'
}

const STEPS: Step[] = [
  {
    id: 'welcome',
    title: '¡Bienvenido a FORMACIONES!',
    text: 'Esta guía te lleva por las funciones principales. Podés saltarla en cualquier momento.',
    targetSelector: null,
    action: 'click-next',
  },
  {
    id: 'click-dancer',
    title: 'Hacé click en un integrante',
    text: 'Hacé click sobre cualquier integrante del escenario para seleccionarlo y ver sus propiedades.',
    targetSelector: '#stage-canvas',
    action: 'wait-dancer-click',
  },
  {
    id: 'drag-dancer',
    title: 'Arrastrá un integrante',
    text: 'Arrastrá cualquier integrante para moverlo a una nueva posición.',
    targetSelector: '#stage-canvas',
    action: 'wait-drag',
  },
  {
    id: 'formation',
    title: 'Aplicá una formación',
    text: 'Hacé click en "Triángulo" en el panel izquierdo para reorganizar a todos en esa forma.',
    targetSelector: '#btn-triangle',
    action: 'wait-formation',
  },
  {
    id: 'multi-select',
    title: 'Multi-selección',
    text: 'Manteniendo Ctrl (o Cmd), hacé click en 3 o más integrantes para seleccionarlos juntos.',
    targetSelector: '#stage-canvas',
    action: 'wait-multi-select',
  },
  {
    id: 'change-color',
    title: 'Cambiá el color',
    text: 'Usá el selector de color en la barra de herramientas para cambiar el color de todos los seleccionados.',
    targetSelector: '#color-picker',
    action: 'wait-color',
  },
  {
    id: 'new-scene',
    title: 'Nueva escena',
    text: 'Hacé click en "+ Escenas" para agregar una segunda escena coreográfica.',
    targetSelector: '#btn-new-scene',
    action: 'wait-scene',
  },
  {
    id: 'dup-scene',
    title: 'Duplicar escena',
    text: 'Hacé click en el botón ⧉ para duplicar la escena actual con todos sus integrantes.',
    targetSelector: '#btn-dup-scene',
    action: 'wait-dup-scene',
  },
  {
    id: 'move-scene2',
    title: 'Cambiá a la escena 1',
    text: 'Hacé click en la escena 1 y reorganizá los integrantes para crear una formación diferente.',
    targetSelector: '#stage-canvas',
    action: 'click-next',
  },
  {
    id: 'preview',
    title: 'Preview de animación',
    text: 'Hacé click en "▶ Preview" para ver la transición animada entre tus escenas.',
    targetSelector: '#btn-preview',
    action: 'wait-preview',
  },
  {
    id: 'done',
    title: '¡Listo! Ya sabés lo básico.',
    text: 'Explorá las 20+ formaciones, el audio sincronizado, las estadísticas y mucho más.',
    targetSelector: null,
    action: 'click-finish',
  },
]

const STORAGE_KEY = 'tutorial_v1_done'

interface Props {
  onFinish: () => void
}

export function TutorialOverlay({ onFinish }: Props) {
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const { selectedIds, scenes } = useEditorStore()
  const prevSelectedLen = useRef(0)
  const prevScenesLen = useRef(scenes.length)
  const prevColorRef = useRef<string | null>(null)

  const step = STEPS[stepIndex]

  // Compute target element rect
  useEffect(() => {
    if (!step.targetSelector) { setTargetRect(null); return }
    const el = document.querySelector(step.targetSelector) as HTMLElement | null
    if (!el) { setTargetRect(null); return }
    const rect = el.getBoundingClientRect()
    setTargetRect(rect)
  }, [step])

  const advance = useCallback(() => {
    setStepIndex(i => i + 1)
    prevSelectedLen.current = 0
  }, [])

  // Auto-advance listeners for wait-* actions
  useEffect(() => {
    if (step.action === 'wait-multi-select') {
      if (selectedIds.length >= 3) advance()
    }
  }, [selectedIds, step.action, advance])

  useEffect(() => {
    if (step.action === 'wait-scene') {
      if (scenes.length > prevScenesLen.current) { advance(); prevScenesLen.current = scenes.length }
    }
    if (step.action === 'wait-dup-scene') {
      if (scenes.length > prevScenesLen.current) { advance(); prevScenesLen.current = scenes.length }
    }
  }, [scenes.length, step.action, advance])

  useEffect(() => {
    if (!['wait-dancer-click', 'wait-drag', 'wait-formation', 'wait-color', 'wait-preview'].includes(step.action)) return

    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement

      if (step.action === 'wait-dancer-click') {
        const group = target.closest('canvas')
        if (group && selectedIds.length > 0) advance()
      }

      if (step.action === 'wait-formation') {
        if (target.closest('#btn-triangle')) { setTimeout(advance, 800) }
      }

      if (step.action === 'wait-preview') {
        if (target.closest('#btn-preview')) { setTimeout(advance, 1200) }
      }

      if (step.action === 'wait-drag') {
        // Mark as dragged if a dragend happens on canvas
      }
    }

    function handleDragEnd() {
      if (step.action === 'wait-drag') advance()
    }

    function handleColorChange() {
      if (step.action === 'wait-color') {
        const picker = document.getElementById('color-picker') as HTMLInputElement | null
        if (picker && picker.value !== prevColorRef.current) {
          prevColorRef.current = picker.value
          setTimeout(advance, 400)
        }
      }
    }

    document.addEventListener('click', handleClick)
    document.addEventListener('dragend', handleDragEnd)
    const picker = document.getElementById('color-picker')
    if (picker) picker.addEventListener('input', handleColorChange)

    return () => {
      document.removeEventListener('click', handleClick)
      document.removeEventListener('dragend', handleDragEnd)
      if (picker) picker.removeEventListener('input', handleColorChange)
    }
  }, [step.action, advance, selectedIds])

  function finish() {
    localStorage.setItem(STORAGE_KEY, 'true')
    onFinish()
  }

  const tooltipStyle: React.CSSProperties = targetRect
    ? {
        position: 'fixed',
        top: targetRect.bottom + 12,
        left: Math.min(targetRect.left, window.innerWidth - 320),
        zIndex: 10001,
      }
    : {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 10001,
      }

  return (
    <>
      {/* Fondo semitransparente */}
      <div
        className="fixed inset-0 bg-negro/75 z-[10000] pointer-events-none"
      />

      {/* Spotlight sobre el elemento target */}
      {targetRect && (
        <div
          className="fixed z-[10000] pointer-events-none"
          style={{
            top: targetRect.top - 4,
            left: targetRect.left - 4,
            width: targetRect.width + 8,
            height: targetRect.height + 8,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.75)',
            borderRadius: 8,
            border: '2px solid rgba(201,169,97,0.6)',
          }}
        />
      )}

      {/* Tooltip del paso */}
      <div style={tooltipStyle} className="w-80 bg-[#1c1c1c] border border-dorado/40 rounded-xl shadow-2xl p-5 z-[10001]">
        <div className="flex items-start justify-between mb-2">
          <h3 className="text-dorado text-sm font-medium leading-snug">{step.title}</h3>
          <button
            onClick={finish}
            className="text-gris/40 hover:text-gris text-xs ml-3 shrink-0 transition-colors"
          >
            Saltar
          </button>
        </div>
        <p className="text-blanco-calido/70 text-xs leading-relaxed mb-4">{step.text}</p>

        {/* Progress dots */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === stepIndex ? 'bg-dorado' : i < stepIndex ? 'bg-dorado/40' : 'bg-borde'
                }`}
              />
            ))}
          </div>

          {(step.action === 'click-next') && (
            <button
              onClick={advance}
              className="text-xs text-negro bg-dorado hover:bg-dorado-oscuro px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              Siguiente →
            </button>
          )}
          {step.action === 'click-finish' && (
            <button
              onClick={finish}
              className="text-xs text-negro bg-dorado hover:bg-dorado-oscuro px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              ¡Listo! ✓
            </button>
          )}
          {!['click-next', 'click-finish'].includes(step.action) && (
            <span className="text-[10px] text-gris/50">Realizá la acción →</span>
          )}
        </div>
      </div>
    </>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function isTutorialDone(): boolean {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}
