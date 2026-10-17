import { useEffect, useRef, useState } from 'react'
import { decodeRuns, manualRegion } from '../utils/sceneImage'
import { SCENE_TAGS } from '../data/scenePoems'

export default function ScenePicture({ scene, selected = [], highlight, onToggle, drawing, onDraw }) {
  const canvasRef = useRef(null), startRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const { width, height, regions } = scene.analysis
  useEffect(() => {
    const ctx = canvasRef.current.getContext('2d')
    const overlay = ctx.createImageData(width, height)
    for (const region of regions) {
      const mask = decodeRuns(region.runs, width * height)
      const active = highlight ? region.tag === highlight : selected.includes(region.id)
      for (let i = 0; i < mask.length; i++) {
        if (!mask[i]) continue
        const edge = i % width === 0 || i % width === width - 1 || !mask[i - 1] || !mask[i + 1] || !mask[i - width] || !mask[i + width]
        if (!edge && !active) continue
        overlay.data.set(active ? [196, 150, 60, edge ? 245 : 54] : [248, 229, 175, 155], i * 4)
      }
    }
    ctx.putImageData(overlay, 0, 0)
  }, [width, height, regions, selected, highlight])
  const position = event => {
    const rect = event.currentTarget.getBoundingClientRect()
    return { x: Math.max(0, Math.min(.9999, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(.9999, (event.clientY - rect.top) / rect.height)) }
  }
  const finish = event => {
    if (!startRef.current) return
    const start = startRef.current; startRef.current = null
    const end = position(event); setDrag(null)
    if (drawing) {
      const region = manualRegion(start, end, width, height, drawing, SCENE_TAGS[drawing])
      if (region) onDraw?.(region)
    } else if (Math.abs(start.x - end.x) + Math.abs(start.y - end.y) < .04) {
      const index = Math.floor(end.y * height) * width + Math.floor(end.x * width)
      const region = [...regions].reverse().find(region => decodeRuns(region.runs, width * height)[index])
      if (region) onToggle?.(region.id)
    }
  }
  return <div className={`scene-picture${drawing ? ' is-drawing' : ''}`} style={{ aspectRatio: `${width}/${height}` }}
    onPointerDown={event => { if (!onToggle && !onDraw) return; startRef.current = position(event); if (drawing) { event.currentTarget.setPointerCapture(event.pointerId); setDrag({ start: startRef.current, end: startRef.current }) } }}
    onPointerMove={event => { if (drawing && startRef.current) setDrag({ start: startRef.current, end: position(event) }) }}
    onPointerUp={finish} onPointerCancel={() => { startRef.current = null; setDrag(null) }}>
    <img src={scene.image} alt='当前诗境原图' draggable='false' />
    <canvas ref={canvasRef} width={width} height={height} aria-hidden='true' />
    {drag && <span className='scene-draw-box' style={{ left: `${Math.min(drag.start.x, drag.end.x) * 100}%`, top: `${Math.min(drag.start.y, drag.end.y) * 100}%`, width: `${Math.abs(drag.start.x - drag.end.x) * 100}%`, height: `${Math.abs(drag.start.y - drag.end.y) * 100}%` }} />}
    {drawing && <span className='scene-picture__hint'>拖动圈出「{SCENE_TAGS[drawing]}」</span>}
  </div>
}
