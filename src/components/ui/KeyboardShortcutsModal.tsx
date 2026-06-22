interface Props { onClose: () => void }

const SECTIONS = [
  {
    title: 'Edición',
    shortcuts: [
      { keys: ['Ctrl', 'Z'],          desc: 'Deshacer' },
      { keys: ['Ctrl', 'Shift', 'Z'], desc: 'Rehacer' },
      { keys: ['Ctrl', 'A'],          desc: 'Seleccionar todo' },
      { keys: ['Delete'],             desc: 'Eliminar selección' },
      { keys: ['Esc'],                desc: 'Cerrar panel / Deseleccionar' },
    ],
  },
  {
    title: 'Canvas',
    shortcuts: [
      { keys: ['Click'],              desc: 'Seleccionar integrante' },
      { keys: ['Ctrl', 'Click'],      desc: 'Selección múltiple' },
      { keys: ['Drag vacío'],         desc: 'Lasso de selección' },
      { keys: ['Doble click'],        desc: 'Propiedades del integrante' },
      { keys: ['Drag integrante'],    desc: 'Mover (grupal si hay selección)' },
    ],
  },
  {
    title: 'Zoom & Pan',
    shortcuts: [
      { keys: ['Rueda ratón'],        desc: 'Zoom centrado en cursor' },
      { keys: ['Alt', 'Drag'],        desc: 'Paneo del escenario' },
      { keys: ['Click %'],            desc: 'Resetear zoom a 100%' },
      { keys: ['0'],                  desc: 'Resetear zoom y posición' },
      { keys: ['⤢'],                  desc: 'Ajustar a pantalla' },
    ],
  },
]

export function KeyboardShortcutsModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-negro/80 backdrop-blur-sm"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-negro border border-borde rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-medium text-blanco-calido tracking-wide">Atajos de teclado</h2>
          <button onClick={onClose} className="text-gris hover:text-blanco-calido text-xl leading-none">×</button>
        </div>
        <div className="space-y-5">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <div className="text-[9px] text-dorado/60 uppercase tracking-[0.2em] mb-2">{section.title}</div>
              <div className="space-y-1.5">
                {section.shortcuts.map(s => (
                  <div key={s.desc} className="flex items-center justify-between gap-4 text-xs">
                    <span className="text-blanco-calido/70">{s.desc}</span>
                    <div className="flex gap-1 shrink-0">
                      {s.keys.map(k => (
                        <kbd key={k}
                          className="px-1.5 py-0.5 bg-negro border border-borde/60 rounded text-[10px] text-gris font-mono">
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-gris/30 mt-5 text-center">Presioná Esc para cerrar</p>
      </div>
    </div>
  )
}
