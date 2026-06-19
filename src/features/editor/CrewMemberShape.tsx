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

// Forma M con picos muy pronunciados y valle casi a la altura de la base.
// Path de referencia: "M -16 16 L -8 2 L 0 14 L 8 2 L 16 16 Z"
//   peak_x  = bw * 0.5    (8/16)
//   peak_y  = bh * 0.125  (2/16)  — picos muy altos
//   valley_y= bh * 0.875  (14/16) — valle casi tan abajo como la base
function mShapePoints(bw: number, bh: number): number[] {
  const px = bw * 0.50   // x del pico
  const py = bh * 0.125  // y del pico — muy arriba
  const vy = bh * 0.875  // y del valle — casi en la base
  return [
    -bw, bh,   // base izquierda
    -px, py,   // PICO izquierdo
      0, vy,   // VALLE central (casi tan abajo como la base)
     px, py,   // PICO derecho
     bw, bh,   // base derecha
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

  const headR = size * 0.56          // cabeza moderada para que la M sea visible
  const bw    = size * 1.20          // M más ancha
  const bh    = size * 1.35          // M más alta = picos más pronunciados

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
          y={bh * 0.5}
          radius={headR + bh * 0.6}
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
          y={bh * 0.5}
          radius={headR + bh * 0.6 + 3}
          fill="transparent"
          stroke="#E53E3E"
          strokeWidth={2 / levelScale}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Cuerpo — forma M rellena sólida */}
      <Line
        points={mShapePoints(bw, bh)}
        closed
        fill={fillColor}
        stroke="transparent"
        x={0}
        y={headR * 0.35}
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
