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

  // Dos factores separados: la M del logo es mucho más ancha que alta.
  // kh = escala vertical (cabeza + altura de la M)
  // kw = escala horizontal (ancho de la M ≈ 3.5× el diámetro de la cabeza)
  const kh = size / 16   // escala Y
  const kw = size / 9    // escala X — M considerablemente más ancha

  // CRÍTICO: array PLANO — Konva no acepta pares anidados
  // Y crece hacia ABAJO en canvas:
  //   y=2  → ARRIBA (picos)
  //   y=14 → ABAJO  (valle, casi en la base)
  //   y=16 → BASE
  const bodyPoints = [
    -16 * kw,  16 * kh,   // base izquierda
     -8 * kw,   2 * kh,   // PICO izquierdo (arriba)
      0,        14 * kh,  // VALLE (abajo, casi en la base)
      8 * kw,   2 * kh,   // PICO derecho (arriba)
     16 * kw,  16 * kh,   // base derecha
  ]

  // Cabeza: borde inferior en y=2*kh (nivel de los picos)
  const headRadius  = 7 * kh
  const headCenterY = -5 * kh

  const strokeColor = outsideStage ? '#E53E3E' : selected ? '#C9A961' : undefined
  const strokeWidth = (outsideStage || selected) ? 2 * k : 0

  // Diagnóstico temporal
  console.log('CrewMemberShape bodyPoints:', bodyPoints)
  console.log('k:', k, 'size:', size, 'headCenterY:', headCenterY)

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
      {/* Cuerpo en M — closed=true, tension sin definir (=0 por defecto) */}
      <Line
        points={bodyPoints}
        closed={true}
        fill={fillColor}
        lineJoin="miter"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
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
