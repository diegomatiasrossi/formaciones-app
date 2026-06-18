import { memo } from 'react'
import { Circle, Rect, RegularPolygon, Group, Text, Arrow } from 'react-konva'
import type { Dancer } from '@/types'
import { LEVEL_OPACITY, LEVEL_SCALE } from '@/types'

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
}

const EDGE_ARROW: Record<string, [number, number]> = {
  top:    [0, -1],
  bottom: [0,  1],
  left:   [-1, 0],
  right:  [1,  0],
}

export const DancerNode = memo(function DancerNode({
  dancer, selected, showLabel,
  animOpacity, animX, animY,
  onDragEnd, onDragStart, onClick, onDblClick,
  onMouseEnter, onMouseLeave,
}: Props) {
  if (dancer.active === false) return null

  const { id, color, shape, size, name, level } = dancer

  const levelOpacity = LEVEL_OPACITY[level]
  const levelScale = LEVEL_SCALE[level]
  const r = size

  const x = animX ?? dancer.x
  const y = animY ?? dancer.y
  const opacity = animOpacity ?? levelOpacity

  function renderShape() {
    const common = {
      fill: color,
      shadowColor: color,
      shadowBlur: selected ? 10 : 0,
      shadowOpacity: 0.6,
    }
    switch (shape) {
      case 'circle':
        return <Circle x={0} y={0} radius={r} {...common} />
      case 'square':
        return <Rect x={-r} y={-r} width={r * 2} height={r * 2} cornerRadius={3} {...common} />
      case 'triangle':
        return <RegularPolygon x={0} y={0} sides={3} radius={r} {...common} />
    }
  }

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
      className="dancer-node"
    >
      {selected && (
        <Circle
          x={0} y={0}
          radius={r / levelScale + 5}
          fill="transparent"
          stroke="#C9A961"
          strokeWidth={2 / levelScale}
          dash={[3 / levelScale, 2 / levelScale]}
          opacity={0.9 / levelScale}
        />
      )}

      {renderShape()}

      {showLabel && (
        <Text
          x={-20 / levelScale} y={-r / levelScale - 14}
          width={40 / levelScale}
          text={name}
          fontSize={9}
          fill="#aaa"
          align="center"
          listening={false}
        />
      )}

      {selected && arrowDir && (
        <Arrow
          points={[
            arrowDir[0] * (r + 10), arrowDir[1] * (r + 10),
            arrowDir[0] * (r + 18), arrowDir[1] * (r + 18),
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
