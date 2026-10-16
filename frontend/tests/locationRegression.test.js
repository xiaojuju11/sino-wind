import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'

async function loadLocation({ fetch, cached = null, storageFails = false }) {
  const writes = []
  const context = vm.createContext({ fetch, AbortController, setTimeout, clearTimeout,
    localStorage: { getItem: () => cached && JSON.stringify(cached), setItem: (key, value) => { if (storageFails) throw new Error('quota'); writes.push([key, value]) } } })
  const source = await fs.readFile(new URL('../src/utils/ancientCities.js', import.meta.url), 'utf8')
  const module = new vm.SourceTextModule(source, { context })
  await module.link(() => { throw new Error('unexpected import') }); await module.evaluate()
  return { api: module.namespace, writes }
}

test('failed IP services return no location so GPS/default can run', async () => {
  const f = await loadLocation({ fetch: async () => { throw new Error('offline') } })
  assert.equal(await f.api.autoDetectUserCity(), null)
  assert.equal(f.writes.length, 0)
})

test('a cancelled location attempt never calls providers or returns a fabricated city', async () => {
  let calls = 0
  const f = await loadLocation({ fetch: async () => { calls++; throw new Error('offline') } })
  const controller = new AbortController(); controller.abort()
  assert.equal(await f.api.autoDetectUserCity(controller.signal), null)
  assert.equal(calls, 0)
})

test('successful detection survives unavailable browser storage', async () => {
  let calls = 0
  const f = await loadLocation({ storageFails: true, fetch: async () => { calls++; return { ok: true, json: async () => ({ city: '成都', success: true }) } } })
  assert.equal((await f.api.autoDetectUserCity()).name, '成都')
  assert.equal(calls, 1)
})

test('legacy cache without a verified source marker cannot impersonate a successful detection', async () => {
  const f = await loadLocation({ cached: { timestamp: Date.now(), data: { name: '杭州' } }, fetch: async () => { throw new Error('offline') } })
  assert.equal(await f.api.autoDetectUserCity(), null)
})
