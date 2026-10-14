import { useEffect, useRef, useState } from 'react'
import { createInkContour, createInkTimeline, getSceneLayout } from './inkWashEngine.js'
import './inkWashBackground.less'

const ART_URL = `${import.meta.env.BASE_URL}assets/home/bg-paper.jpg`
const PAPER = [247, 235, 219]
const clamp = (value) => Math.min(1, Math.max(0, value))

function makeCanvas() {
  return document.createElement('canvas')
}

function extractPigment(image) {
  const canvas = makeCanvas()
  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Canvas unavailable')
  context.drawImage(image, 0, 0)
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data
  for (let y = 0; y < canvas.height; y++) {
    const v = y / canvas.height
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width
      const i = (y * canvas.width + x) * 4
      const edge = v < 0.36
        ? Math.min(1, clamp((0.36 - v) / 0.055), clamp((1 - u) / 0.11))
        : v >= 0.70
          ? Math.min(1, clamp((v - 0.70) / 0.05), clamp(u / 0.14))
          : 0
      const alpha = Math.max(0, (PAPER[0] - data[i] - 9) / 160,
        (PAPER[1] - data[i + 1] - 9) / 160, (PAPER[2] - data[i + 2] - 9) / 160)
      if (alpha < 0.045 || !edge) {
        data[i + 3] = 0
        continue
      }
      const ink = clamp(alpha * 1.25) * edge
      for (let channel = 0; channel < 3; channel++) {
        data[i + channel] = Math.max(0, Math.min(255,
          (data[i + channel] - PAPER[channel] * (1 - ink)) / ink))
      }
      data[i + 3] = Math.round(ink * 255)
    }
  }
  context.putImageData(pixels, 0, 0)
  return canvas
}

function drawParts(context, pigment, layout) {
  for (const part of [layout.top, layout.bottom]) {
    context.drawImage(pigment, part.sx, part.sy, part.sw, part.sh,
      part.dx, part.dy, part.dw, part.dh)
  }
}

function stamp(context, x, y, rx, ry, progress, seed) {
  if (progress <= 0) return
  const contour = createInkContour(1, progress, seed, 64)
  context.save()
  context.translate(x, y)
  context.scale(rx, ry)
  context.beginPath()
  contour.forEach((point, index) => {
    if (index === 0) context.moveTo(point.x, point.y)
    else context.lineTo(point.x, point.y)
  })
  context.closePath()
  context.fill()
  context.restore()
}

function paintMask(context, layout, frame) {
  const { width: w, height: h } = layout
  context.clearRect(0, 0, w, h)
  context.fillStyle = '#363c38'
  if (frame.phase === 'entrance') {
    const blooms = [
      [layout.top.dx + 0.19 * w, layout.top.dy + 0.13 * h, 0.75 * w, 1.35 * h, 11, 0],
      [0.64 * w, 0.38 * h, 0.82 * w, 1.2 * h, 29, 0.11],
      [0.96 * w, 0.3 * h, 0.5 * w, 1.2 * h, 7, 0.2],
      [layout.bottom.dx + 0.24 * w, layout.bottom.dy + 0.72 * h, 0.70 * w, 1.4 * h, 37, 0.25],
      [0.76 * w, 0.54 * h, 0.82 * w, 1.4 * h, 53, 0.38],
    ]
    blooms.forEach(([x, y, rx, ry, seed, delay]) => {
      stamp(context, x, y, rx, ry, clamp((frame.progress - delay) / (1 - delay)), seed)
    })
  } else {
    const top = frame.cycle % 3 === 1
    const x = (top ? 0.17 : frame.cycle % 3 === 2 ? 0.3 : 0.78) * w
    const y = (top ? 0.15 : frame.cycle % 3 === 2 ? 0.76 : 0.4) * h
    stamp(context, x, y, 0.57 * w, 0.87 * h, clamp(frame.progress * 1.3), frame.cycle * 19 + 5)
    stamp(context, x + 0.16 * w, y + 0.12 * h, 0.45 * w, 0.68 * h,
      clamp((frame.progress - 0.16) * 1.4), frame.cycle * 23 + 9)
  }
}

export default function InkWashBackground() {
  const canvasRef = useRef(null)
  const [painted, setPainted] = useState(false)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const image = new Image()
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let alive = true
    let timeline
    let pigment
    let layout
    let scene
    let mask
    let sceneContext
    let maskContext

    function resize() {
      layout = getSceneLayout(window.innerWidth, window.innerHeight,
        pigment.width, pigment.height, window.devicePixelRatio)
      canvas.width = Math.round(layout.width * layout.dpr)
      canvas.height = Math.round(layout.height * layout.dpr)
      context.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0)
      scene = makeCanvas()
      scene.width = canvas.width
      scene.height = canvas.height
      sceneContext = scene.getContext('2d')
      mask = makeCanvas()
      mask.width = layout.width
      mask.height = layout.height
      maskContext = mask.getContext('2d')
      if (!sceneContext || !maskContext) throw new Error('Canvas unavailable')
      sceneContext.setTransform(layout.dpr, 0, 0, layout.dpr, 0, 0)
      draw({ phase: 'static', progress: 1, cycle: 0 })
    }

    function draw(frame) {
      if (!layout) return
      const { width: w, height: h } = layout
      context.clearRect(0, 0, w, h)
      if (frame.phase !== 'entrance') drawParts(context, pigment, layout)
      if (frame.phase === 'static') return
      sceneContext.clearRect(0, 0, w, h)
      sceneContext.globalCompositeOperation = 'source-over'
      drawParts(sceneContext, pigment, layout)
      paintMask(maskContext, layout, frame)
      sceneContext.globalCompositeOperation = 'destination-in'
      sceneContext.filter = 'blur(7px)'
      sceneContext.drawImage(mask, 0, 0, w, h)
      sceneContext.filter = 'none'
      sceneContext.globalCompositeOperation = 'source-over'
      context.save()
      if (frame.phase === 'cycle') {
        context.filter = 'contrast(1.3) brightness(.53) blur(1px)'
        context.globalAlpha = 0.9 * Math.sin(Math.PI * frame.progress)
      }
      context.drawImage(scene, 0, 0, w, h)
      context.restore()
    }

    function syncState() {
      const focused = document.activeElement?.matches?.('input, textarea, [contenteditable]:not([contenteditable="false"])') ?? false
      setPaused(motion.matches || document.hidden || focused)
      timeline?.setState({ reduced: motion.matches, hidden: document.hidden, focused })
    }

    const onResize = () => { if (pigment) resize() }
    image.onload = () => {
      if (!alive) return
      try {
        pigment = extractPigment(image)
        resize()
        timeline = createInkTimeline({
          draw, now: () => performance.now(),
          requestFrame: (callback) => requestAnimationFrame(callback),
          cancelFrame: (id) => cancelAnimationFrame(id),
          setTimer: (callback, delay) => setTimeout(callback, delay),
          clearTimer: (id) => clearTimeout(id),
          reduced: motion.matches, hidden: document.hidden,
        })
        setPainted(true)
        timeline.start()
        syncState()
      } catch {
        timeline?.dispose()
        setPainted(false)
      }
    }
    image.onerror = () => { if (alive) setPainted(false) }
    image.src = ART_URL
    window.addEventListener('resize', onResize)
    document.addEventListener('visibilitychange', syncState)
    document.addEventListener('focusin', syncState)
    document.addEventListener('focusout', syncState)
    motion.addEventListener('change', syncState)
    return () => {
      alive = false
      image.onload = image.onerror = null
      timeline?.dispose()
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', syncState)
      document.removeEventListener('focusin', syncState)
      document.removeEventListener('focusout', syncState)
      motion.removeEventListener('change', syncState)
    }
  }, [])

  return (
    <div className={`home-ink-wash${painted ? ' is-painted' : ''}${paused ? ' is-paused' : ''}`}
      aria-hidden="true" style={{ '--ink-art-url': `url("${ART_URL}")` }}>
      <div className="home-ink-wash__fallback home-ink-wash__fallback--top" />
      <div className="home-ink-wash__fallback home-ink-wash__fallback--bottom" />
      <canvas ref={canvasRef} className="home-ink-wash__canvas" />
      <div className="home-ink-wash__mist" />
    </div>
  )
}
