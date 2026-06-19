import { memo } from 'react'
import { Group, Circle, Line } from 'react-konva'
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

  const fillColor = dancer.leader === true ? '#C9A961' : color

  // DOS TRIÁNGULOS separados — evita el problema de relleno de polígono cóncavo
  const kh = size / 16   // escala vertical
  const kw = size / 9    // escala horizontal (M más ancha que la cabeza)

  const ph = 2 * kh    // y de los picos (bien arriba)
  const bh = 16 * kh   // y de la base
  const pw = 8 * kw    // x de los picos
  const bw = 16 * kw   // x de la base exterior
  const gap = 2 * kw   // hueco entre los dos brazos en la base

  // Brazo izquierdo: base-exterior-izq → pico-izq → base-interior-izq
  const leftArm  = [-bw, bh,  -pw, ph,  -gap, bh]
  // Brazo derecho: base-interior-der → pico-der → base-exterior-der
  const rightArm = [ gap, bh,   pw, ph,   bw,  bh]

  // Cabeza: centro arriba, borde inferior toca el nivel de los picos
  const headRadius  = 7 * kh
  const headCenterY = ph - headRadius   // borde inferior = ph = nivel de picos

  const strokeColor = outsideStage ? '#E53E3E' : selected ? '#C9A961' : undefined
  const strokeWidth = (outsideStage || selected) ? 2 * kh : 0

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
      {/* Brazo izquierdo */}
      <Line
        points={leftArm}
        closed={true}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineJoin="miter"
        listening={false}
      />
      {/* Brazo derecho */}
      <Line
        points={rightArm}
        closed={true}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        lineJoin="miter"
        listening={false}
      />

      {/* Cabeza encajada entre los picos — borde inferior en y=2*k */}
      <Circle
        x={0}
        y={headCenterY}
        radius={headRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {showLabel && (
        <Line
          points={[0, 0]}  // placeholder para mantener z-order
          listening={false}
          opacity={0}
        />
      )}
    </Group>
  )
})
