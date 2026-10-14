import { useEffect, useRef } from 'react'
import { createInkContour, createInkTimeline } from './inkWashEngine.js'
import { createLandscapeGeometry, paintLandscape, paintAtmosphere } from './inkLandscape.js'
import { useTheme } from '../context/useTheme'
import './inkWashBackground.less'

export default function InkWashBackground({ atmosphereOnly = false }) {
  const canvasRef = useRef(null)
  const rootRef = useRef(null)
  const { isDark } = useTheme()
  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')
    if (!context) return undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const scene = document.createElement('canvas')
    const sceneContext = scene.getContext('2d')
    if (!sceneContext) return undefined
    let width, height, dpr, timeline
    function draw(frame) {
      context.clearRect(0, 0, width, height)
      context.save()
      if (!atmosphereOnly && frame.phase === 'entrance') {
        const contour = createInkContour(1, frame.progress, 41, 80)
        context.beginPath()
        contour.forEach((p, i) => {
          const x = width * (.4 + p.x * 1.65), y = height * (.35 + p.y * 1.65)
          if (i) context.lineTo(x, y); else context.moveTo(x, y)
        })
        context.closePath(); context.clip()
      }
      if (!atmosphereOnly) context.drawImage(scene, 0, 0, width, height)
      context.restore()
      if (frame.phase !== 'static') paintAtmosphere(context, width, height, frame.progress, isDark, frame.cycle)
    }
    function resize() {
      width = Math.max(1, rootRef.current.clientWidth)
      height = Math.max(1, rootRef.current.clientHeight)
      dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1))
      canvas.width = scene.width = Math.round(width * dpr)
      canvas.height = scene.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      sceneContext.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (!atmosphereOnly) paintLandscape(sceneContext, createLandscapeGeometry(width, height), isDark)
      draw({ phase: 'static', progress: 1, cycle: 0 })
    }
    function syncState() {
      const focused = document.activeElement?.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])') ?? false
      rootRef.current?.classList.toggle('is-paused', motion.matches || document.hidden || focused)
      timeline?.setState({ reduced: motion.matches, hidden: document.hidden, focused })
    }
    resize()
    timeline = createInkTimeline({ draw, now: () => performance.now(), requestFrame: requestAnimationFrame,
      cancelFrame: cancelAnimationFrame, setTimer: setTimeout, clearTimer: clearTimeout,
      reduced: motion.matches, hidden: document.hidden })
    timeline.start(); syncState()
    window.addEventListener('resize', resize)
    document.addEventListener('visibilitychange', syncState)
    document.addEventListener('focusin', syncState)
    document.addEventListener('focusout', syncState)
    motion.addEventListener('change', syncState)
    return () => {
      timeline.dispose()
      window.removeEventListener('resize', resize)
      document.removeEventListener('visibilitychange', syncState)
      document.removeEventListener('focusin', syncState)
      document.removeEventListener('focusout', syncState)
      motion.removeEventListener('change', syncState)
    }
  }, [isDark, atmosphereOnly])
  return <div ref={rootRef} className={`home-ink-wash is-painted${atmosphereOnly ? ' is-atmosphere' : ''}`} aria-hidden="true"><canvas ref={canvasRef} className="home-ink-wash__canvas" /><div className="home-ink-wash__mist" /></div>
}
