import test from 'node:test'
import assert from 'node:assert/strict'
import { createLandscapeGeometry, paintLandscape, paintAtmosphere } from '../src/components/inkLandscape.js'

test('procedural landscape is deterministic, bounded and finite across mobile sizes', () => {
  for (const [w, h] of [[320, 740], [390, 844], [480, 900], [480, 320]]) {
    const scene = createLandscapeGeometry(w, h)
    assert.deepEqual(scene, createLandscapeGeometry(w, h))
    assert.notDeepEqual(scene.ridges, createLandscapeGeometry(w, h, 99).ridges)
    for (const ridge of scene.ridges) for (const p of ridge.points) {
      assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y))
      assert.ok(p.x >= 0 && p.x <= w && p.y >= 0 && p.y <= h)
    }
  }
})

test('day/night render uses only finite vector commands and no image or pixel readback', () => {
  let commands = 0
  const ctx = new Proxy({}, { get: (_, method) => {
    if (method === 'drawImage' || method === 'getImageData') return () => assert.fail('bitmap input forbidden')
    if (String(method).startsWith('create')) return (...args) => { assert.ok(args.every(Number.isFinite)); return { addColorStop() {} } }
    return (...args) => { commands++; assert.ok(args.every(Number.isFinite), `${String(method)} has invalid coordinates`) }
  }, set: () => true })
  for (const dark of [false, true]) {
    paintLandscape(ctx, createLandscapeGeometry(390, 844), dark)
    for (const p of [0, .25, .5, 1]) paintAtmosphere(ctx, 390, 844, p, dark)
  }
  assert.ok(commands < 15000, 'bounded geometry cost')
})
