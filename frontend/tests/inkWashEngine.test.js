import test from 'node:test'
import assert from 'node:assert/strict'
import { createInkContour, createInkTimeline, getProgress, getSceneLayout } from '../src/components/inkWashEngine.js'

function clock() {
  let time = 0
  let serial = 0
  const jobs = new Map()
  const add = (callback, delay) => {
    const id = ++serial
    jobs.set(id, { at: time + delay, callback })
    return id
  }
  return {
    now: () => time,
    requestFrame: (callback) => add(callback, 34),
    cancelFrame: (id) => jobs.delete(id),
    setTimer: (callback, delay) => add(callback, delay),
    clearTimer: (id) => jobs.delete(id),
    pending: () => jobs.size,
    tick(duration) {
      const end = time + duration
      while (true) {
        const next = [...jobs].sort((a, b) => a[1].at - b[1].at)[0]
        if (!next || next[1].at > end) break
        jobs.delete(next[0])
        time = next[1].at
        next[1].callback()
      }
      time = end
    },
  }
}

test('scene parts stay within viewports with bounded DPR and intact aspect ratio', () => {
  for (const [w, h] of [[390, 844], [320, 700], [1440, 900], [844, 390]]) {
    const layout = getSceneLayout(w, h, 941, 1672, 3)
    assert.equal(layout.dpr, 1.5)
    for (const part of [layout.top, layout.bottom]) {
      assert.ok(part.dx >= 0 && part.dy >= 0)
      assert.ok(part.dx + part.dw <= w && part.dy + part.dh <= h)
      assert.ok(Math.abs(part.dw / part.dh - part.sw / part.sh) < 0.0001)
    }
    assert.equal(layout.bottom.dy + layout.bottom.dh, h)
  }
})

test('organic contours are deterministic and spread unevenly', () => {
  assert.equal(getProgress(-1, 4000), 0)
  assert.equal(getProgress(8000, 4000), 1)
  const early = createInkContour(72, 0.3, 42)
  const late = createInkContour(72, 0.8, 42)
  assert.deepEqual(early, createInkContour(72, 0.3, 42))
  const radii = early.map(({ x, y }) => Math.hypot(x, y))
  assert.ok(Math.max(...radii) - Math.min(...radii) > 3)
  assert.ok(Math.hypot(...Object.values(late[0])) > Math.hypot(...Object.values(early[0])))
})

test('entrance settles, then periodic ink cycles without idle frames', () => {
  const c = clock()
  const frames = []
  const timeline = createInkTimeline({ ...c, draw: (frame) => frames.push(frame) })
  timeline.start()
  c.tick(4100)
  assert.equal(frames.at(-1).phase, 'static')
  assert.equal(c.pending(), 1)
  const count = frames.length
  c.tick(7800)
  assert.equal(frames.length, count)
  c.tick(100)
  assert.equal(frames.at(-1).phase, 'cycle')
  c.tick(4300)
  assert.equal(frames.at(-1).phase, 'static')
  c.tick(7700)
  assert.equal(frames.at(-1).cycle, 2)
  timeline.dispose()
  assert.equal(c.pending(), 0)
})

test('visibility, input focus and reduced motion cancel pending work', () => {
  const c = clock()
  const frames = []
  const timeline = createInkTimeline({ ...c, draw: (frame) => frames.push(frame) })
  timeline.start()
  timeline.setState({ hidden: true })
  assert.equal(c.pending(), 0)
  const count = frames.length
  c.tick(40000)
  assert.equal(frames.length, count)
  timeline.setState({ hidden: false })
  assert.equal(frames.at(-1).phase, 'static')
  timeline.setState({ focused: true })
  assert.equal(c.pending(), 0)
  timeline.setState({ focused: false })
  assert.equal(c.pending(), 1)
  timeline.setState({ reduced: true })
  assert.equal(c.pending(), 0)
  timeline.dispose()
  timeline.start()
  assert.equal(c.pending(), 0)
})

test('initial reduced motion draws a static painting only', () => {
  const c = clock()
  const frames = []
  const timeline = createInkTimeline({ ...c, reduced: true, draw: (frame) => frames.push(frame) })
  timeline.start()
  assert.deepEqual(frames.map((frame) => frame.phase), ['static'])
  assert.equal(c.pending(), 0)
})
