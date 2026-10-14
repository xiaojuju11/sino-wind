import test from 'node:test'
import assert from 'node:assert/strict'
import { InkEngine } from '../src/utils/inkEngine/InkEngine.js'

test('fireflies stay at five or six and never drift into the reading band', () => {
  const previous = globalThis.window
  globalThis.window = { devicePixelRatio: 2 }
  try {
    for (const [width, height] of [[320, 740], [390, 844], [480, 900], [1440, 900]]) {
      const engine = new InkEngine({ getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width, height }) })
      engine.setAtmosphere(new Date(2026, 9, 14), true, 'firefly')
      assert.ok(engine.particles.length >= 5 && engine.particles.length <= 6)
      for (let frame = 0; frame < 600; frame++) {
        engine.update(1 / 60)
        for (const p of engine.particles) assert.ok(p.pos.y <= height * .16 || p.pos.y >= height * .91)
      }
      engine.destroy()
    }
  } finally { globalThis.window = previous }
})

test('pause cancels animation work and repeated resume never creates parallel loops', () => {
  const oldWindow = globalThis.window, oldRaf = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame
  const pending = new Set(); let serial = 0
  globalThis.window = { devicePixelRatio: 1 }
  globalThis.requestAnimationFrame = () => { const id = ++serial; pending.add(id); return id }
  globalThis.cancelAnimationFrame = id => pending.delete(id)
  try {
    const engine = new InkEngine({ getContext: () => ({ setTransform() {} }), getBoundingClientRect: () => ({ width: 390, height: 844 }) })
    engine.start(); assert.equal(pending.size, 1)
    engine.pause(); assert.equal(pending.size, 0)
    engine.start(); assert.equal(pending.size, 0)
    engine.resume(); engine.resume(); assert.equal(pending.size, 1)
    engine.destroy(); assert.equal(pending.size, 0)
    engine.resume(); assert.equal(pending.size, 0)
  } finally {
    globalThis.window = oldWindow; globalThis.requestAnimationFrame = oldRaf; globalThis.cancelAnimationFrame = oldCancel
  }
})
