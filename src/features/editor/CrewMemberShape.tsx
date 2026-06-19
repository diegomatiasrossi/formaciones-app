import { memo } from 'react'
import { Group, Circle, Path, Text } from 'react-konva'

interface Props {
  x: number
  y: number
  color: string
  size: number
  name: string
  selected: boolean
  showLabel: boolean
  isLeader?: boolean
  opacity?: number
  scaleX?: number
  scaleY?: number
  draggable?: boolean
  onDragStart?: () => void
  onDragEnd?: (x: number, y: number) => void
  onClick?: (meta: boolean) => void
  onDblClick?: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  outsideStage?: boolean
}

// ∧ brazos levantados: vértice arriba, brazos se abren hacia abajo-afuera
function chevronPath(w: number, h: number): string {
  return `M ${-w} ${h} L 0 ${h * 0.05} L ${w} ${h}`
}

const GOLD = '#B8962E'

export const CrewMemberShape = memo(function CrewMemberShape({
  x, y, color, size, name, selected, showLabel,
  isLeader, opacity = 1, scaleX = 1, scaleY = 1,
  draggable = true,
  onDragStart, onDragEnd, onClick, onDblClick,
  onMouseEnter, onMouseLeave,
  outsideStage = false,
}: Props) {
  const fillColor = isLeader ? GOLD : color
  const headR = Math.max(5, size * 0.55)
  const bodyW = size * 0.85
  const bodyH = size * 1.1
  const strokeW = 2 / scaleX

  return (
    <Group
      x={x}
      y={y}
      scaleX={scaleX}
      scaleY={scaleY}
      opacity={opacity}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={e => onDragEnd?.(e.target.x(), e.target.y())}
      onClick={e => onClick?.((e.evt as MouseEvent).ctrlKey || (e.evt as MouseEvent).metaKey)}
      onTap={() => onClick?.(false)}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Anillo de selección */}
      {selected && (
        <Circle
          x={0}
          y={bodyH * 0.2}
          radius={headR + bodyH * 0.6}
          fill="transparent"
          stroke={GOLD}
          strokeWidth={1.5 / scaleX}
          dash={[3 / scaleX, 2 / scaleX]}
          opacity={0.85}
          listening={false}
        />
      )}

      {/* Alerta fuera del escenario */}
      {outsideStage && (
        <Circle
          x={0}
          y={bodyH * 0.2}
          radius={headR + bodyH * 0.6 + 3}
          fill="transparent"
          stroke="#E53E3E"
          strokeWidth={2 / scaleX}
          opacity={0.9}
          listening={false}
        />
      )}

      {/* Cuerpo — ∧ brazos levantados, como en el logo */}
      <Path
        data={chevronPath(bodyW, bodyH)}
        x={0}
        y={headR * 0.9}
        stroke={fillColor}
        strokeWidth={size * 0.55}
        fill="transparent"
        lineCap="butt"
        lineJoin="miter"
        shadowColor={fillColor}
        shadowBlur={selected ? 8 : 0}
        shadowOpacity={0.4}
        listening={false}
      />

      {/* Cabeza — círculo */}
      <Circle
        x={0}
        y={0}
        radius={headR}
        fill={fillColor}
        stroke={selected ? GOLD : (outsideStage ? '#E53E3E' : 'transparent')}
        strokeWidth={selected || outsideStage ? strokeW : 0}
        shadowColor={fillColor}
        shadowBlur={selected ? 10 : 3}
        shadowOpacity={0.4}
      />

      {/* Etiqueta — nombre/número */}
      {showLabel && (
        <Text
          x={-20 / scaleX}
          y={headR + bodyH * 0.9}
          width={40 / scaleX}
          text={name}
          fontSize={8}
          fill={isLeader ? GOLD : '#ccc'}
          align="center"
          listening={false}
        />
      )}
    </Group>
  )
})
