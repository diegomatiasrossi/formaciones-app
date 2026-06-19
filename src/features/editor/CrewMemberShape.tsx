import { memo } from 'react'
import { Group, Circle, Rect, Text, Arrow } from 'react-konva'
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

  const { id, color, size, level } = dancer
  const levelOpacity = LEVEL_OPACITY[level]
  const levelScale   = LEVEL_SCALE[level]
  const x = animX ?? dancer.x
  const y = animY ?? dancer.y
  const opacity = animOpacity ?? levelOpacity

  const fillColor = dancer.leader === true ? GOLD : color

  // Personita en forma de "i" — igual que la letra del logo Crewficina:
  // Punto (círculo) arriba + tallo (rectángulo) abajo
  const headR  = size * 0.55          // radio del círculo (punto de la i)
  const stemW  = size * 0.45          // ancho del tallo
  const stemH  = size * 1.10          // alto del tallo
  const gap    = size * 0.05          // pequeño espacio entre cabeza y tallo

  const stemY  = headR + gap          // y donde empieza el tallo
  const totalH = headR + gap + stemH  // altura total de la figura

  const strokeW  = 2 / levelScale
  const selStroke = selected ? GOLD : outsideStage ? '#E53E3E' : undefined

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
          y={totalH / 2 - headR}
          radius={Math.max(headR, stemW / 2) + 6}
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
          y={totalH / 2 - headR}
          radius={Math.max(headR, stemW / 2) + 8}
          fill="transparent"
          stroke="#E53E3E"
          strokeWidth={2 / levelScale}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Tallo — rectángulo (cuerpo de la i) */}
      <Rect
        x={-stemW / 2}
        y={stemY}
        width={stemW}
        height={stemH}
        fill={fillColor}
        cornerRadius={stemW * 0.15}
        stroke={selStroke}
        strokeWidth={selStroke ? strokeW : 0}
        shadowColor={fillColor}
        shadowBlur={selected ? 8 : 2}
        shadowOpacity={0.3}
        listening={false}
      />

      {/* Punto — círculo (cabeza de la i) */}
      <Circle
        x={0}
        y={0}
        radius={headR}
        fill={fillColor}
        stroke={selStroke}
        strokeWidth={selStroke ? strokeW : 0}
        shadowColor={fillColor}
        shadowBlur={selected ? 10 : 3}
        shadowOpacity={0.4}
      />

      {/* Etiqueta */}
      {showLabel && (
        <Text
          x={-20 / levelScale}
          y={stemY + stemH + 3}
          width={40 / levelScale}
          text={dancer.name}
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
