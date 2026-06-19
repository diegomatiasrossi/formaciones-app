import { useCallback, useEffect, useRef, useState, memo } from 'react'
import { Stage, Layer, Line, Rect, Text, Group } from 'react-konva'
import type Konva from 'konva'
import { useEditorStore } from '@/store/editorStore'
import { CrewMemberShape } from './CrewMemberShape'
import { DancerPropertiesPanel } from '@/components/ui/DancerPropertiesPanel'
import type { StageRatio } from '@/types'

const STAGE_PADDING = 40

const ZONE_COLORS = [
  'rgba(60,20,20,0.15)', 'rgba(60,40,10,0.15)', 'rgba(20,40,20,0.15)',
  'rgba(20,20,60,0.15)', 'rgba(40,20,40,0.15)', 'rgba(20,40,60,0.15)',
  'rgba(60,20,40,0.15)', 'rgba(20,60,40,0.15)', 'rgba(60,40,20,0.15)',
]
const ZONE_LABELS = [
  'Fondo Izq', 'Fondo Centro', 'Fondo Der',
  'Centro Izq', 'Centro', 'Centro Der',
  'Frente Izq', 'Frente Centro', 'Frente Der',
]

interface LassoState {
  active: boolean; x1: number; y1: number; x2: number; y2: number
}
type DragSnapshot = Map<string, { x: number; y: number }>

interface AnimatedDancers {
  dancers: { id: string; x: number; y: number; opacity: number }[]
}
interface Props {
  animationOverride?: AnimatedDancers | null
  stageRatio?: StageRatio
  maxDancers?: number
}

// Zoom limits
const MIN_SCALE = 0.3
const MAX_SCALE = 4

export const StageCanvas = memo(function StageCanvas({ animationOverride, stageRatio = '16:9', maxDancers = Infinity }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<Konva.Stage>(null)
  const isDraggingDancer = useRef(false)
  const dragSnapshot = useRef<DragSnapshot>(new Map())
  const isDraggingStage = useRef(false)

  // Zoom & pan state
  const [scale, setScale] = useState(1)
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 })

  const {
    scenes, activeSceneId, selectedIds, tool,
    showGrid, showLabels, showZones, gridSize,
    stageWidth, stageHeight,
    setStageSize, addDancerAt, moveDancer, moveDancers,
    select, clearSelection, setSelectedIds,
    undo, redo,
  } = useEditorStore()

  const activeScene = scenes.find(s => s.id === activeSceneId)
  const dancers = activeScene?.dancers ?? []

  const [lasso, setLasso] = useState<LassoState>({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 })
  const [propsDancerId, setPropsDancerId] = useState<string | null>(null)
  const [cursorStyle, setCursorStyle] = useState<string>('default')

  // ── Resize ─────────────────────────────────────────────────────
  useEffect(() => {
    function resize() {
      if (!containerRef.current) return
      setStageSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (containerRef.current) ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [setStageSize])

  // ── Cursor contextual — 4.2 ────────────────────────────────────
  useEffect(() => {
    setCursorStyle(tool === 'add' ? 'crosshair' : 'default')
  }, [tool])

  // ── Atajos de teclado ──────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault(); e.shiftKey ? redo() : undo()
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (useEditorStore.getState().selectedIds.length > 0)
          useEditorStore.getState().deleteSelected()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault(); useEditorStore.getState().selectAll()
      }
      if (e.key === 'Escape') setPropsDancerId(null)
      // Reset zoom con '0'
      if (e.key === '0' && !e.ctrlKey) { setScale(1); setStagePos({ x: 0, y: 0 }) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo])

  // ── Export PNG ────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => {
      if (!stageRef.current) return
      // Reset temporalmente zoom para export limpio
      const prevScale = scale
      const prevPos = stagePos
      stageRef.current.scale({ x: 1, y: 1 })
      stageRef.current.position({ x: 0, y: 0 })
      const url = stageRef.current.toDataURL({ pixelRatio: 2 })
      stageRef.current.scale({ x: prevScale, y: prevScale })
      stageRef.current.position(prevPos)
      const a = document.createElement('a')
      a.download = 'formacion.png'; a.href = url; a.click()
    }
    window.addEventListener('export-png', handler)
    return () => window.removeEventListener('export-png', handler)
  }, [scale, stagePos])

  // ── Coords del escenario (respeta stageRatio) ────────────────
  const sx = STAGE_PADDING; const sy = STAGE_PADDING
  const availW = stageWidth - STAGE_PADDING * 2
  const availH = stageHeight - STAGE_PADDING * 2
  const sw = stageRatio === '9:16' ? Math.round(availH * 9 / 16) : availW
  const sh = stageRatio === '1:1'  ? availW : availH

  // ── Grid ──────────────────────────────────────────────────────
  const gridLines: React.ReactNode[] = []
  if (showGrid) {
    const step = gridSize * 4
    for (let x = 0; x <= sw; x += step)
      gridLines.push(<Line key={`gx${x}`} points={[sx + x, sy, sx + x, sy + sh]} stroke="#252525" strokeWidth={0.5} listening={false} />)
    for (let y = 0; y <= sh; y += step)
      gridLines.push(<Line key={`gy${y}`} points={[sx, sy + y, sx + sw, sy + y]} stroke="#252525" strokeWidth={0.5} listening={false} />)
  }

  // ── Zonas ────────────────────────────────────────────────────
  const zones: React.ReactNode[] = []
  if (showZones) {
    const zw = sw / 3; const zh = sh / 3
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const i = row * 3 + col
        zones.push(
          <Group key={`z${i}`} listening={false}>
            <Rect x={sx + col * zw} y={sy + row * zh} width={zw} height={zh} fill={ZONE_COLORS[i]} stroke="#2a2a2a" strokeWidth={0.5} />
            <Text x={sx + col * zw} y={sy + row * zh} width={zw} height={zh} text={ZONE_LABELS[i]} fontSize={9} fill="#444" align="center" verticalAlign="middle" listening={false} />
          </Group>,
        )
      }
    }
  }

  // ── Zoom con rueda del mouse ──────────────────────────────────
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault()
    const stage = stageRef.current
    if (!stage) return
    const oldScale = stage.scaleX()
    const pointer = stage.getPointerPosition()!
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    }
    const direction = e.evt.deltaY < 0 ? 1 : -1
    const factor = 1.08
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE,
      direction > 0 ? oldScale * factor : oldScale / factor,
    ))
    setScale(newScale)
    setStagePos({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    })
  }, [])

  // ── Lasso y click de stage ────────────────────────────────────
  const handleStageMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target !== e.target.getStage() && e.target.getParent() !== e.target.getStage()) return
    if (tool === 'add') return
    if (e.evt.button === 1 || (e.evt.button === 0 && e.evt.altKey)) {
      // Botón medio o Alt+drag → pan
      isDraggingStage.current = true
      setCursorStyle('grab')
      return
    }
    const pos = stage2canvas(e)
    if (pos) setLasso({ active: true, x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y })
  }, [tool])

  const handleStageMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDraggingStage.current) {
      const stage = stageRef.current!
      const pos = stage.getPointerPosition()!
      // Pan manual calculado con el movimiento
      setStagePos(prev => ({
        x: prev.x + e.evt.movementX,
        y: prev.y + e.evt.movementY,
      }))
      void pos
      return
    }
    if (!lasso.active) return
    const pos = stage2canvas(e)
    if (pos) setLasso(prev => ({ ...prev, x2: pos.x, y2: pos.y }))
  }, [lasso.active])

  const handleStageMouseUp = useCallback(() => {
    if (isDraggingStage.current) {
      isDraggingStage.current = false
      setCursorStyle(tool === 'add' ? 'crosshair' : 'default')
      return
    }
    if (!lasso.active) return
    const { x1, y1, x2, y2 } = lasso
    const minX = Math.min(x1, x2); const maxX = Math.max(x1, x2)
    const minY = Math.min(y1, y2); const maxY = Math.max(y1, y2)
    if (maxX - minX > 4 || maxY - minY > 4)
      setSelectedIds(dancers.filter(d => d.x >= minX && d.x <= maxX && d.y >= minY && d.y <= maxY).map(d => d.id))
    else clearSelection()
    setLasso({ active: false, x1: 0, y1: 0, x2: 0, y2: 0 })
  }, [lasso, dancers, setSelectedIds, clearSelection, tool])

  function stage2canvas(e: Konva.KonvaEventObject<MouseEvent>) {
    return e.target.getStage()?.getPointerPosition() ?? null
  }

  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (isDraggingDancer.current || isDraggingStage.current) return
    if (e.target !== e.target.getStage()) return
    if (tool === 'add') {
      const currentCount = useEditorStore.getState().scenes.find(
        s => s.id === useEditorStore.getState().activeSceneId,
      )?.dancers.length ?? 0
      if (currentCount >= maxDancers) return
      const pos = e.target.getStage()!.getPointerPosition()!
      addDancerAt(pos.x, pos.y)
    }
  }, [tool, addDancerAt, maxDancers])

  // ── Bug 1 fix: drag grupal ─────────────────────────────────────
  const handleDragStart = useCallback((id: string) => {
    isDraggingDancer.current = true
    setCursorStyle('grabbing')
    if (!useEditorStore.getState().selectedIds.includes(id)) select(id, false)
    const state = useEditorStore.getState()
    const scene = state.scenes.find(s => s.id === state.activeSceneId)
    const ids = state.selectedIds
    dragSnapshot.current = new Map(
      (scene?.dancers ?? []).filter(d => ids.includes(d.id)).map(d => [d.id, { x: d.x, y: d.y }]),
    )
  }, [select])

  const handleDragEnd = useCallback((id: string, newX: number, newY: number) => {
    isDraggingDancer.current = false
    setCursorStyle(tool === 'add' ? 'crosshair' : 'default')
    const startPos = dragSnapshot.current.get(id)
    const currentIds = useEditorStore.getState().selectedIds
    if (startPos && currentIds.includes(id) && currentIds.length > 1) {
      const dx = newX - startPos.x
      const dy = newY - startPos.y
      moveDancers(currentIds.map(sid => {
        const sp = dragSnapshot.current.get(sid)
        return { id: sid, x: (sp?.x ?? 0) + dx, y: (sp?.y ?? 0) + dy }
      }))
    } else {
      moveDancer(id, newX, newY)
    }
    dragSnapshot.current.clear()
  }, [moveDancer, moveDancers, tool])

  const handleDancerClick = useCallback((id: string, meta: boolean) => {
    if (isDraggingDancer.current) return
    select(id, meta)
  }, [select])

  const handleDancerDblClick = useCallback((id: string) => {
    setPropsDancerId(id)
  }, [])

  // ── Cursor sobre bailarín ─────────────────────────────────────
  const handleDancerMouseEnter = useCallback(() => {
    if (tool === 'select' && !isDraggingDancer.current)
      setCursorStyle('pointer')
  }, [tool])

  const handleDancerMouseLeave = useCallback(() => {
    if (!isDraggingDancer.current)
      setCursorStyle(tool === 'add' ? 'crosshair' : 'default')
  }, [tool])

  const propsDancer = propsDancerId ? dancers.find(d => d.id === propsDancerId) : null

  return (
    <div
      id="stage-canvas"
      ref={containerRef}
      className="w-full h-full bg-[#0e0e0e] relative overflow-hidden"
      style={{ cursor: cursorStyle }}
    >
      {/* Controles de zoom */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1">
        <button
          onClick={() => {
            const s = Math.min(MAX_SCALE, scale * 1.2)
            setScale(s)
          }}
          className="w-7 h-7 flex items-center justify-center bg-negro/80 border border-borde/40 rounded text-xs text-gris hover:text-blanco-calido hover:border-dorado/40 transition-colors"
          title="Acercar (+)"
        >+</button>
        <button
          onClick={() => { setScale(1); setStagePos({ x: 0, y: 0 }) }}
          className="px-2 h-7 flex items-center justify-center bg-negro/80 border border-borde/40 rounded text-[10px] text-gris hover:text-blanco-calido hover:border-dorado/40 transition-colors tabular-nums"
          title="Resetear zoom (0)"
        >{Math.round(scale * 100)}%</button>
        <button
          onClick={() => {
            const s = Math.max(MIN_SCALE, scale / 1.2)
            setScale(s)
          }}
          className="w-7 h-7 flex items-center justify-center bg-negro/80 border border-borde/40 rounded text-xs text-gris hover:text-blanco-calido hover:border-dorado/40 transition-colors"
          title="Alejar (-)"
        >−</button>
        <button
          onClick={() => {
            if (!containerRef.current) return
            const fitScale = Math.min(
              containerRef.current.clientWidth / stageWidth,
              containerRef.current.clientHeight / stageHeight,
            ) * 0.9
            setScale(fitScale)
            setStagePos({
              x: (containerRef.current.clientWidth - stageWidth * fitScale) / 2,
              y: (containerRef.current.clientHeight - stageHeight * fitScale) / 2,
            })
          }}
          className="w-7 h-7 flex items-center justify-center bg-negro/80 border border-borde/40 rounded text-xs text-gris hover:text-blanco-calido hover:border-dorado/40 transition-colors"
          title="Ajustar a pantalla"
        >⤢</button>
      </div>

      <Stage
        ref={stageRef}
        width={stageWidth}
        height={stageHeight}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        onMouseDown={handleStageMouseDown}
        onMouseMove={handleStageMouseMove}
        onMouseUp={handleStageMouseUp}
        onClick={handleStageClick}
        onTouchStart={e => {
          if (tool === 'add') {
            const currentCount = useEditorStore.getState().scenes.find(
              s => s.id === useEditorStore.getState().activeSceneId,
            )?.dancers.length ?? 0
            if (currentCount >= maxDancers) return
            const pos = e.target.getStage()!.getPointerPosition()!
            addDancerAt(pos.x, pos.y)
          }
        }}
      >
        <Layer>
          {gridLines}
          {zones}

          {/* Marco del escenario */}
          <Rect x={sx} y={sy} width={sw} height={sh}
            fill="transparent" stroke="#C9A961" strokeWidth={1} dash={[6, 4]} cornerRadius={4} listening={false} />

          {/* Indicador de público */}
          <Text x={sx} y={sy + sh + 8} width={sw} text="▼  PÚBLICO  ▼"
            fontSize={9} fill="#C9A961" align="center" opacity={0.5} listening={false} />

          {/* Integrantes */}
          {dancers.map(dancer => {
            const anim = animationOverride?.dancers.find(a => a.id === dancer.id)
            const dx = anim?.x ?? dancer.x
            const dy = anim?.y ?? dancer.y
            const outsideStage = dx < sx || dx > sx + sw || dy < sy || dy > sy + sh
            return (
              <CrewMemberShape
                key={dancer.id}
                x={dx}
                y={dy}
                color={dancer.color}
                size={dancer.size}
                name={dancer.name}
                selected={selectedIds.includes(dancer.id)}
                showLabel={showLabels}
                isLeader={(dancer as any).leader === true}
                opacity={anim?.opacity ?? 1}
                scaleX={1}
                scaleY={1}
                outsideStage={outsideStage}
                onDragEnd={(nx, ny) => handleDragEnd(dancer.id, nx, ny)}
                onDragStart={() => handleDragStart(dancer.id)}
                onClick={(meta) => handleDancerClick(dancer.id, meta)}
                onDblClick={() => handleDancerDblClick(dancer.id)}
                onMouseEnter={handleDancerMouseEnter}
                onMouseLeave={handleDancerMouseLeave}
              />
            )
          })}

          {/* Lasso */}
          {lasso.active && (
            <Rect
              x={Math.min(lasso.x1, lasso.x2)} y={Math.min(lasso.y1, lasso.y2)}
              width={Math.abs(lasso.x2 - lasso.x1)} height={Math.abs(lasso.y2 - lasso.y1)}
              fill="rgba(201,169,97,0.06)" stroke="#C9A961" strokeWidth={1} dash={[4, 3]} listening={false}
            />
          )}
        </Layer>
      </Stage>

      {propsDancer && (
        <DancerPropertiesPanel dancer={propsDancer} onClose={() => setPropsDancerId(null)} />
      )}
    </div>
  )
})
