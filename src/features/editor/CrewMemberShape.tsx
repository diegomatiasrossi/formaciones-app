import { memo } from 'react'
import { Group, Circle, Line, Text, Arrow } from 'react-konva'
import { LEVEL_OPACITY, LEVEL_SCALE } from '@/types'
import type { Dancer } from '@/types'

interface Props {
  dancer: Dancer
  selected: boolean
  showLabel: boolean
  animOpacity?: number
  animX?: number
  animY?: number
  onDragEnd: (id: string, x: number, y: number) => void
  onDragStart: (id: string) => void
  onClick: (id: string, meta: boolean) => void
  onDblClick: (id: string) => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  outsideStage?: boolean
}

const GOLD = '#B8962E'

// Polígono ∧ relleno: vértice arriba, brazos abriéndose hacia abajo
// 6 puntos: outer-top → outer-right-bottom → inner-right-bottom → inner-top → inner-left-bottom → outer-left-bottom
function chevronPolygon(bw: number, bh: number, t: number): number[] {
  // inner vertex y = aproximación geométrica de donde se cruzan los bordes internos
  const iv = (t * bh) / bw
  return [
     0,       0,       // vértice exterior (arriba)
     bw,      bh,      // esquina exterior derecha abajo
     bw - t,  bh,      // esquina interior derecha abajo
     0,       iv,      // vértice interior (un poco más abajo que el exterior)
    -(bw - t), bh,     // esquina interior izquierda abajo
    -bw,      bh,      // esquina exterior izquierda abajo
  ]
}

const EDGE_ARROW: Record<string, [number, number]> = {
  top:    [0, -1],
  bottom: [0,  1],
  left:   [-1, 0],
  right:  [1,  0],
}

export const CrewMemberShape = memo(function CrewMemberShape({
  dancer, selected, showLabel,
  animOpacity, animX, animY,
  onDragEnd, onDragStart, onClick, onDblClick,
  onMouseEnter, onMouseLeave,
  outsideStage = false,
}: Props) {
  if (dancer.active === false) return null

  const { id, color, size, name, level } = dancer

  const levelOpacity = LEVEL_OPACITY[level]
  const levelScale   = LEVEL_SCALE[level]

  const x = animX ?? dancer.x
  const y = animY ?? dancer.y
  const opacity = animOpacity ?? levelOpacity

  const fillColor = (dancer as any).leader === true ? GOLD : color

  // dimensiones proporcionales al tamaño del integrante
  const headR = size * 0.52
  const bw    = size * 0.88   // ancho externo del ∧
  const bh    = size * 1.15   // alto del ∧
  const t     = size * 0.46   // grosor del brazo

  const arrowDir = dancer.entryEdge ? EDGE_ARROW[dancer.entryEdge] : null

  return (
    <Group
      x={x}
      y={y}
      scaleX={levelScale}
      scaleY={levelScale}
      opacity={opacity}
      draggable
      onDragStart={() => onDragStart(id)}
      onDragEnd={e => onDragEnd(id, e.target.x(), e.target.y())}
      onClick={e => onClick(id, (e.evt as MouseEvent).ctrlKey || (e.evt as MouseEvent).metaKey)}
      onTap={() => onClick(id, false)}
      onDblClick={() => onDblClick(id)}
      onDblTap={() => onDblClick(id)}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Anillo de selección */}
      {selected && (
        <Circle
          x={0}
          y={bh * 0.55}
          radius={headR + bh * 0.65}
          fill="transparent"
          stroke={GOLD}
          strokeWidth={1.5 / levelScale}
          dash={[3 / levelScale, 2 / levelScale]}
          opacity={0.85}
          listening={false}
        />
      )}

      {/* Alerta fuera del escenario */}
      {outsideStage && (
        <Circle
          x={0}
          y={bh * 0.55}
          radius={headR + bh * 0.65 + 3}
          fill="transparent"
          stroke="#E53E3E"
          strokeWidth={2 / levelScale}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Cuerpo — polígono ∧ relleno (v con punto encima) */}
      <Line
        points={chevronPolygon(bw, bh, t)}
        closed
        fill={fillColor}
        stroke="transparent"
        x={0}
        y={headR * 0.85}
        shadowColor={fillColor}
        shadowBlur={selected ? 8 : 2}
        shadowOpacity={0.3}
        listening={false}
      />

      {/* Cabeza — círculo */}
      <Circle
        x={0}
        y={0}
        radius={headR}
        fill={fillColor}
        stroke={selected ? GOLD : (outsideStage ? '#E53E3E' : 'transparent')}
        strokeWidth={selected || outsideStage ? 2 / levelScale : 0}
        shadowColor={fillColor}
        shadowBlur={selected ? 10 : 3}
        shadowOpacity={0.4}
      />

      {/* Etiqueta */}
      {showLabel && (
        <Text
          x={-20 / levelScale}
          y={headR + bh + 4}
          width={40 / levelScale}
          text={name}
          fontSize={8}
          fill={fillColor === GOLD ? GOLD : '#bbb'}
          align="center"
          listening={false}
        />
      )}

      {/* Flecha de entrada/salida */}
      {selected && arrowDir && (
        <Arrow
          points={[
            arrowDir[0] * (headR + 10), arrowDir[1] * (headR + 10),
            arrowDir[0] * (headR + 18), arrowDir[1] * (headR + 18),
          ]}
          pointerLength={5}
          pointerWidth={5}
          fill="#888"
          stroke="#888"
          strokeWidth={1.5}
          listening={false}
        />
      )}
    </Group>
  )
})
