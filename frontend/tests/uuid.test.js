import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'
import crypto from 'node:crypto'

// Load the real source with an instrumented global `crypto` / `Math`, so we can
// assert WHICH random source is used without touching globalThis.crypto.
async function loadUUID(env = {}) {
  const source = await fs.readFile(new URL('../src/utils/uuid.js', import.meta.url), 'utf8')
  const calls = { randomUUID: 0, getRandomValues: 0, mathRandom: 0 }
  const M = Object.create(null)
  for (const k of Object.getOwnPropertyNames(Math)) M[k] = Math[k]
  M.random = () => { calls.mathRandom++; return 0.5 }

  const sandbox = { Math: M, Uint8Array, Array, String, Number, console }
  if (env.crypto !== false) {
    const c = {}
    if (env.randomUUID !== false) c.randomUUID = () => { calls.randomUUID++; return '11111111-1111-4111-8111-111111111111' }
    if (env.getRandomValues === 'ok') c.getRandomValues = (arr) => { calls.getRandomValues++; crypto.randomFillSync(arr); return arr }
    if (env.getRandomValues === 'throw') c.getRandomValues = () => { calls.getRandomValues++; throw new Error('disabled') }
    sandbox.crypto = c
  }
  const body = source.replace(/^export /gm, '')
  const fn = vm.runInNewContext(body + '\n;safeUUID', sandbox)
  return { fn, calls }
}

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

test('secure context uses the native crypto.randomUUID', async () => {
  const { fn, calls } = await loadUUID()
  assert.equal(fn(), '11111111-1111-4111-8111-111111111111')
  assert.equal(calls.randomUUID, 1)
  assert.equal(calls.getRandomValues, 0)
  assert.equal(calls.mathRandom, 0)
})

test('plain HTTP / LAN IP uses the CSPRNG fallback, never Math.random', async () => {
  const { fn, calls } = await loadUUID({ randomUUID: false, getRandomValues: 'ok' })
  const id = fn()
  assert.match(id, V4)
  assert.equal(calls.getRandomValues, 1, 'must use crypto.getRandomValues in an insecure context')
  assert.equal(calls.mathRandom, 0, 'must not degrade to the predictable Math.random')
  assert.equal(calls.randomUUID, 0)
})

test('the HTTP fallback produces distinct, version-4, variant-correct IDs', async () => {
  const { fn, calls } = await loadUUID({ randomUUID: false, getRandomValues: 'ok' })
  const ids = new Set()
  for (let i = 0; i < 200; i++) {
    const id = fn()
    assert.match(id, V4)
    assert.equal(id[14], '4')
    assert.ok('89ab'.includes(id[19]))
    ids.add(id)
  }
  assert.equal(ids.size, 200, 'no collisions even with a frozen Math.random')
  assert.equal(calls.mathRandom, 0)
})

test('unavailable or throwing crypto never breaks ID generation', async () => {
  const cases = [
    { crypto: false },
    { randomUUID: false, getRandomValues: 'absent' },
    { randomUUID: false, getRandomValues: 'throw' },
  ]
  for (const env of cases) {
    const { fn } = await loadUUID(env)
    assert.match(fn(), V4)
    assert.doesNotThrow(() => fn())
  }
})
