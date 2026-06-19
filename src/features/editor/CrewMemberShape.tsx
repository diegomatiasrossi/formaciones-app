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

const GOLD = '#C9A961'

// Layout: y=0 = centro de la cabeza.
// Los picos de la M quedan exactamente al nivel del borde inferior de la cabeza (y=headR),
// por lo que la cabeza encaja entre los dos picos — igual que en el logo.
//
// Forma M (coordenadas relativas al centro del Group = centro de la cabeza):
//   pico_y  = headR           — al ras del borde inferior de la cabeza
//   valle_y = headR + bh*0.70 — valle profundo (70% de la altura del cuerpo)
//   base_y  = headR + bh      — base de la M
function mShapePoints(bw: number, bh: number, headR: number): number[] {
  const px = bw * 0.62           // picos a 62% del semiancho — más anchos que la cabeza
  const peakY  = headR           // picos justo al borde inferior de la cabeza
  const valleyY = headR + bh * 0.70  // valle profundo
  const baseY   = headR + bh         // base de la M
  return [
    -bw,  baseY,    // base izquierda
    -px,  peakY,    // PICO izquierdo — a nivel del borde inferior de la cabeza
      0,  valleyY,  // VALLE central  — bien profundo y visible
     px,  peakY,    // PICO derecho
     bw,  baseY,    // base derecha
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

  const fillColor = dancer.leader === true ? GOLD : color

  const headR = size * 0.52    // cabeza
  const bw    = size * 1.15   // semiancho de la M (más ancha que la cabeza)
  const bh    = size * 0.90   // altura del cuerpo bajo los picos

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
      {/* Anillo de selección — centrado en el cuerpo completo */}
      {selected && (
        <Circle
          x={0}
          y={headR + bh * 0.5}
          radius={bw * 0.85}
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
          y={headR + bh * 0.5}
          radius={bw * 0.85 + 3}
          fill="transparent"
          stroke="#E53E3E"
          strokeWidth={2 / levelScale}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Cuerpo — forma M rellena (picos al borde inferior de la cabeza) */}
      <Line
        points={mShapePoints(bw, bh, headR)}
        closed
        fill={fillColor}
        stroke="transparent"
        x={0}
        y={0}
        shadowColor={fillColor}
        shadowBlur={selected ? 8 : 2}
        shadowOpacity={0.3}
        listening={false}
      />

      {/* Cabeza — círculo sobre el espacio central de la M */}
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
          y={headR * 0.55 + bh + 4}
          width={40 / levelScale}
          text={name}
          fontSize={8}
          fill={fillColor === GOLD ? GOLD : '#bbb'}
          align="center"
          listening={false}
        />
      )}

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
