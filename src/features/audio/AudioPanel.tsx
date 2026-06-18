import { useEffect, useRef, useState, useCallback } from 'react'
import { useEditorStore } from '@/store/editorStore'
import { UpgradeGate } from '@/components/ui/UpgradeGate'

const MAX_SIZE_MB = 20

function fmt(secs: number) {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

interface Props {
  onSceneChange?: (sceneId: string) => void
  locked?: boolean
}

export function AudioPanel({ onSceneChange, locked }: Props) {
  if (locked) {
    return (
      <div className="border-t border-borde bg-[#0f0f0f] shrink-0 h-28 flex items-center justify-center">
        <UpgradeGate requiredPlan="solo_pro" featureName="Sincronización de audio" />
      </div>
    )
  }
  const { scenes, setActiveScene, audioMarkers, setSceneMarker } = useEditorStore()

  const audioRef       = useRef<HTMLAudioElement>(null)
  const canvasRef      = useRef<HTMLCanvasElement>(null)
  const animFrameRef   = useRef<number>(0)
  const timelineRef    = useRef<HTMLDivElement>(null)
  const lastSceneRef   = useRef<string | null>(null)
  const prevCheckMsRef = useRef<number>(0)

  const [isPlaying, setIsPlaying]   = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration]     = useState(0)
  const [speed, setSpeed]           = useState(1)
  const [fileName, setFileName]     = useState('')
  const [error, setError]           = useState('')
  const [draggingMarker, setDraggingMarker] = useState<string | null>(null)
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null)

  // Draw static waveform
  useEffect(() => {
    if (!audioBuffer || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const w = canvas.width; const h = canvas.height
    ctx.clearRect(0, 0, w, h)
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / w)
    ctx.fillStyle = '#C9A961'
    for (let x = 0; x < w; x++) {
      let max = 0
      for (let j = 0; j < step; j++) { const v = Math.abs(data[x * step + j] ?? 0); if (v > max) max = v }
      const barH = Math.max(1, max * h * 0.9)
      ctx.globalAlpha = 0.6
      ctx.fillRect(x, (h - barH) / 2, 1, barH)
    }
    ctx.globalAlpha = 1
  }, [audioBuffer])

  // Redraw waveform + playhead on time update
  useEffect(() => {
    if (!canvasRef.current || !audioBuffer || duration === 0) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')!
    const w = canvas.width; const h = canvas.height
    const data = audioBuffer.getChannelData(0)
    const step = Math.ceil(data.length / w)
    ctx.clearRect(0, 0, w, h)
    ctx.fillStyle = '#C9A961'
    for (let x = 0; x < w; x++) {
      let max = 0
      for (let j = 0; j < step; j++) { const v = Math.abs(data[x * step + j] ?? 0); if (v > max) max = v }
      const barH = Math.max(1, max * h * 0.9)
      ctx.globalAlpha = (x / w) <= currentTime / duration ? 0.9 : 0.35
      ctx.fillRect(x, (h - barH) / 2, 1, barH)
    }
    ctx.globalAlpha = 1
    const px = (currentTime / duration) * w
    ctx.strokeStyle = '#C9A961'; ctx.lineWidth = 1.5
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke()
  }, [currentTime, audioBuffer, duration])

  // Real-time scene sync — ventana rolling entre ticks (más robusta)
  useEffect(() => {
    function tick() {
      const audio = audioRef.current
      if (!audio || audio.paused) return
      setCurrentTime(audio.currentTime)

      const currentMs = audio.currentTime * 1000
      const prevMs    = prevCheckMsRef.current
      prevCheckMsRef.current = currentMs

      // Detectar cualquier marcador entre el tick anterior y el actual
      const match = audioMarkers
        .filter(m => m.timestampMs > prevMs && m.timestampMs <= currentMs)
        .sort((a, b) => a.timestampMs - b.timestampMs)[0]

      if (match && match.sceneId !== lastSceneRef.current) {
        lastSceneRef.current = match.sceneId
        if (onSceneChange) {
          onSceneChange(match.sceneId)
        } else {
          setActiveScene(match.sceneId)
        }
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    if (isPlaying) {
      prevCheckMsRef.current = (audioRef.current?.currentTime ?? 0) * 1000
      animFrameRef.current = requestAnimationFrame(tick)
    }
    return () => cancelAnimationFrame(animFrameRef.current)
  }, [isPlaying, audioMarkers, setActiveScene, onSceneChange])

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (!file.type.startsWith('audio/')) {
      setError('Solo se permiten archivos de audio (MP3, WAV, OGG).'); return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`El archivo supera ${MAX_SIZE_MB}MB`); return
    }
    setFileName(file.name)
    lastSceneRef.current = null
    prevCheckMsRef.current = 0

    const url = URL.createObjectURL(file)
    if (audioRef.current) { audioRef.current.src = url; audioRef.current.load() }

    const reader = new FileReader()
    reader.onload = async ev => {
      const buf = ev.target?.result as ArrayBuffer
      const ctx = new AudioContext()
      const decoded = await ctx.decodeAudioData(buf)
      setAudioBuffer(decoded)
      await ctx.close()
    }
    reader.readAsArrayBuffer(file)
  }

  const handleTimelineClick = useCallback((e: React.MouseEvent, sceneId: string) => {
    if (!timelineRef.current || duration === 0) return
    const rect = timelineRef.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    setSceneMarker(sceneId, Math.round(t * duration * 1000))
  }, [duration, setSceneMarker])

  const markerForScene = (sceneId: string) =>
    audioMarkers.find(m => m.sceneId === sceneId)?.timestampMs ?? null

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!canvasRef.current || !audioRef.current || duration === 0) return
    const rect = canvasRef.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = t * duration
    setCurrentTime(t * duration)
    lastSceneRef.current = null
    prevCheckMsRef.current = t * duration * 1000
  }

  return (
    <div className="border-t border-borde bg-[#0f0f0f] text-blanco-calido p-3 shrink-0">
      <audio
        ref={audioRef}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => { setIsPlaying(false); lastSceneRef.current = null; prevCheckMsRef.current = 0 }}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        preload="metadata"
      />

      <div className="flex items-start gap-4">
        {/* Controls */}
        <div className="flex flex-col gap-2 shrink-0 w-40">
          <label className="text-[10px] text-dorado uppercase tracking-wider">🎵 Audio</label>

          <label className="cursor-pointer px-3 py-2 border border-dashed border-borde rounded-lg
                            text-xs text-gris hover:border-dorado/50 hover:text-dorado transition-colors text-center">
            <span className="line-clamp-1 block">{fileName || 'Subir MP3 / WAV'}</span>
            <input type="file" accept="audio/*" onChange={handleFile} className="hidden" />
          </label>

          {error && <span className="text-red-400 text-[10px]">{error}</span>}

          <div className="flex gap-1">
            <button
              onClick={() => { if (!audioRef.current) return; isPlaying ? audioRef.current.pause() : audioRef.current.play() }}
              disabled={!fileName}
              className="flex-1 py-1.5 text-xs border border-borde rounded-md hover:border-dorado/50 hover:text-dorado transition-colors disabled:opacity-30"
            >{isPlaying ? '⏸' : '▶'}</button>
            <button
              onClick={() => {
                if (!audioRef.current) return
                audioRef.current.pause(); audioRef.current.currentTime = 0
                setCurrentTime(0); lastSceneRef.current = null; prevCheckMsRef.current = 0
              }}
              disabled={!fileName}
              className="px-2.5 py-1.5 text-xs border border-borde rounded-md hover:border-dorado/50 transition-colors disabled:opacity-30"
            >⏹</button>
          </div>

          <div className="text-xs text-gris tabular-nums">{fmt(currentTime)} / {fmt(duration)}</div>

          <div className="flex gap-1">
            {[0.5, 1, 1.5].map(s => (
              <button key={s}
                onClick={() => { setSpeed(s); if (audioRef.current) audioRef.current.playbackRate = s }}
                className={`flex-1 py-1 text-[10px] border rounded transition-colors ${speed === s ? 'border-dorado text-dorado bg-dorado/10' : 'border-borde text-gris hover:border-dorado/40'}`}
              >{s}×</button>
            ))}
          </div>
        </div>

        {/* Waveform + markers */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <canvas
            ref={canvasRef} width={600} height={64}
            onClick={handleCanvasClick}
            className="w-full h-16 rounded-lg bg-[#111] border border-borde/40 cursor-pointer"
            title="Click para buscar posición"
          />

          {!fileName && (
            <p className="text-[10px] text-gris/30 text-center -mt-1">
              Cargá un archivo de audio para ver la forma de onda
            </p>
          )}

          {duration > 0 && (
            <div
              ref={timelineRef}
              className="relative h-9 bg-[#111] rounded-lg border border-borde/40 overflow-hidden select-none"
            >
              <div className="absolute top-0 left-0 bottom-0 bg-dorado/10 pointer-events-none"
                style={{ width: `${(currentTime / duration) * 100}%` }} />
              <div className="absolute top-0 bottom-0 w-px bg-dorado/50 pointer-events-none"
                style={{ left: `${(currentTime / duration) * 100}%` }} />

              {scenes.map((scene, i) => {
                const ms  = markerForScene(scene.id)
                const pct = ms !== null ? (ms / 1000 / duration) * 100 : null
                return (
                  <div key={scene.id}>
                    <div
                      className="absolute top-0 bottom-0 flex items-center cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ left: `${(i / scenes.length) * 100}%`, width: `${100 / scenes.length}%` }}
                      title={`Click para marcar "${scene.name}"`}
                      onClick={e => handleTimelineClick(e, scene.id)}
                    >
                      <span className="text-[9px] text-gris/40 px-1.5 truncate">{i + 1}</span>
                    </div>
                    {pct !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-dorado cursor-ew-resize group z-10"
                        style={{ left: `${pct}%` }}
                        onMouseDown={() => setDraggingMarker(scene.id)}
                        title={`${scene.name}: ${fmt(ms! / 1000)}`}
                      >
                        <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-dorado" />
                        <div className="absolute top-3 left-2 text-[8px] text-dorado whitespace-nowrap opacity-0 group-hover:opacity-100 bg-negro/80 px-1 rounded">
                          {scene.name}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {draggingMarker && (
                <div
                  className="absolute inset-0 cursor-ew-resize z-20"
                  onMouseMove={e => {
                    if (!timelineRef.current || duration === 0) return
                    const rect = timelineRef.current.getBoundingClientRect()
                    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                    setSceneMarker(draggingMarker, Math.round(t * duration * 1000))
                  }}
                  onMouseUp={() => setDraggingMarker(null)}
                  onMouseLeave={() => setDraggingMarker(null)}
                />
              )}
            </div>
          )}

          {duration > 0 && (
            <p className="text-[10px] text-gris/40">
              Click en la barra para marcar cuándo empieza cada escena · Arrastrá el pin para ajustar
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
