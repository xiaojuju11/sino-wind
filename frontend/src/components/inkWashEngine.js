const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))

export function getSceneLayout(width, height, sourceWidth, sourceHeight, dpr = 1) {
  function part(start, fraction, maxWidth, right) {
    const dw = Math.min(width, maxWidth)
    const sh = sourceHeight * fraction
    const dh = dw * sh / sourceWidth
    return {
      sx: 0, sy: sourceHeight * start, sw: sourceWidth, sh,
      dx: right ? width - dw : 0, dy: start ? height - dh : 0, dw, dh,
    }
  }

  return {
    width, height, dpr: clamp(dpr, 1, 1.5),
    top: part(0, 0.36, height * 0.85, false),
    bottom: part(0.70, 0.30, height * 1.2, true),
  }
}

export function getProgress(elapsed, duration) {
  return clamp(elapsed / duration)
}

export function createInkContour(radius, progress, seed, count = 96) {
  const phase = seed * 2.399963
  const spread = clamp(progress) ** 1.25
  return Array.from({ length: count }, (_, i) => {
    const angle = i / count * Math.PI * 2
    const roughness = 1 + 0.14 * Math.sin(3 * angle + phase)
      + 0.085 * Math.sin(7 * angle - phase * 0.7)
      + 0.035 * Math.sin(17 * angle + phase * 1.3)
      + 0.018 * Math.sin(31 * angle - phase)
    const r = radius * spread * roughness
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r }
  })
}

export function createInkTimeline({ draw, now, requestFrame, cancelFrame, setTimer, clearTimer, reduced = false, hidden = false, focused = false }) {
  let flags = { reduced, hidden, focused }
  let raf = null
  let timer = null
  let disposed = false
  let started = false
  let cycle = 0
  let lastFrame = -Infinity
  const blocked = () => flags.reduced || flags.hidden || flags.focused

  function cancel() {
    if (raf !== null) cancelFrame(raf)
    if (timer !== null) clearTimer(timer)
    raf = timer = null
  }

  function schedule(delay = 12000) {
    if (disposed || blocked()) return
    timer = setTimer(() => {
      timer = null
      animate('cycle', 4200)
    }, delay)
  }

  function animate(phase, duration) {
    if (phase === 'cycle') cycle++
    const begin = now()
    function tick() {
      raf = null
      if (disposed || blocked()) return
      const elapsed = now() - begin
      if (elapsed >= duration) {
        draw({ phase: 'static', progress: 1, cycle })
        schedule(Math.max(0, 12000 - elapsed))
        return
      }
      if (now() - lastFrame >= 1000 / 30) {
        draw({ phase, progress: getProgress(elapsed, duration), cycle })
        lastFrame = now()
      }
      raf = requestFrame(tick)
    }
    tick()
  }

  return {
    start() {
      if (started || disposed) return
      started = true
      if (blocked()) draw({ phase: 'static', progress: 1, cycle })
      else animate('entrance', 4000)
    },
    setState(next) {
      if (disposed) return
      const wasBlocked = blocked()
      flags = { ...flags, ...next }
      if (blocked()) {
        cancel()
        if (!flags.hidden) draw({ phase: 'static', progress: 1, cycle })
      } else if (wasBlocked && started) {
        draw({ phase: 'static', progress: 1, cycle })
        schedule()
      }
    },
    dispose() {
      disposed = true
      cancel()
    },
  }
}
