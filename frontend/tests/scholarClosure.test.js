import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'
import { webcrypto } from 'node:crypto'
import { createScholarCertificate } from '../src/utils/scholarCertificate.js'

async function fixture() {
  const storage = new Map(), requests = [], events = new EventTarget()
  const transport = { get: async () => ({ data: { data: [] } }), post: async (url, body) => ({ data: { data: { accepted: body.turns?.map(t => t.id) || [] } } }), getUri: ({ url }) => url }
  const axios = Object.fromEntries(['get', 'post', 'getUri'].map(method => [method, (...args) => { requests.push([method, ...args]); return transport[method](...args) }]))
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) }
  const context = vm.createContext({ localStorage, window: events, Event, crypto: webcrypto, atob, fetch: async () => ({ ok: false }) })
  const modules = new Map()
  const load = async name => {
    if (modules.has(name)) return modules.get(name)
    if (name === '../http') {
      const module = new vm.SyntheticModule(['default'], function () { this.setExport('default', axios) }, { context }); modules.set(name, module); return module
    }
    const file = name.includes('scholarAssets') ? 'scholarAssets.js' : 'scholarLetters.js'
    if (modules.has(file)) return modules.get(file)
    const source = await fs.readFile(new URL(`../src/utils/${file}`, import.meta.url), 'utf8')
    const module = new vm.SourceTextModule(source, { context }); modules.set(file, module)
    await module.link(load)
    return module
  }
  const module = await load('scholarAssets'); await module.evaluate()
  return { assets: module.namespace, letters: modules.get('scholarLetters.js').namespace, localStorage, transport, requests,
    login: id => localStorage.setItem('token', `x.${Buffer.from(JSON.stringify({ id })).toString('base64url')}.x`) }
}
const turn = n => ({ id: webcrypto.randomUUID(), question: `问${n}`, answer: `答${n}`, at: Date.now() + n, degraded: false })

test('guest history and time labels are real, idempotent and isolated from accounts', async () => {
  const f = await fixture()
  for (let i = 0; i < 4; i++) f.letters.saveLocalTurn('libai', turn(i))
  f.letters.leaveScholar('libai')
  const guest = f.letters.cachedLetters()[0]
  assert.equal(guest.rounds, 4); assert.equal(guest.reply.unread, true)
  f.letters.leaveScholar('libai'); assert.equal(f.letters.cachedLetters()[0].reply.id, guest.reply.id)
  assert.match(f.letters.shichen('2026-10-15T15:00:00Z'), /^子时/)
  assert.equal(f.letters.shichen(undefined), '尚未对席')
  f.login(1); await f.letters.loadLetters()
  assert.equal(f.letters.cachedLetters().length, 0)
  assert.equal(f.requests.filter(r => r[0] === 'post').length, 0)
  assert.equal(f.assets.guestArchiveCount(), 4)
  await f.assets.importGuestArchive()
  assert.equal(f.assets.guestArchiveCount(), 0)
  assert.equal(f.requests.filter(r => r[1] === '/api/deepseek/scholar/sync').length, 1)
})
test('failed local upload retains originals; a retry or double load cannot inflate rounds', async () => {
  const f = await fixture(); f.login(1)
  const t = turn(0)
  f.letters.saveLocalTurn('sushi', t); f.letters.saveLocalTurn('sushi', t)
  assert.equal(f.letters.cachedLetters()[0].rounds, 1)
  f.transport.post = async () => { throw new Error('offline') }
  await assert.rejects(f.letters.syncLocalLetters())
  assert.equal(f.letters.cachedLetters()[0].turns[0].pending, true)
  f.transport.post = async (_, body) => ({ data: { data: { accepted: body.turns.map(t => t.id) } } })
  await Promise.all([f.letters.syncLocalLetters(), f.letters.syncLocalLetters()])
  assert.equal(f.letters.cachedLetters()[0].turns[0].pending, false)
  assert.equal(f.letters.cachedLetters()[0].rounds, 1)
  f.login(2); assert.equal(f.letters.cachedLetters().length, 0)
})
test('account change during a delayed cloud fetch never writes another account cache', async () => {
  const f = await fixture(); f.login(1)
  let resolve
  f.transport.get = () => new Promise(done => { resolve = done })
  const request = f.letters.loadLetters()
  await new Promise(done => setImmediate(done))
  f.login(2); resolve({ data: { data: [{ sageId: 'libai', lastMsg: '甲的私密对答', rounds: 1 }] } })
  await request
  assert.equal(f.letters.cachedLetters().length, 0)
})
test('guest artifacts use stable IDs, stay local and require explicit import', async () => {
  const f = await fixture()
  const item = { id: webcrypto.randomUUID(), name: '茶盏', dynasty: '待考', description: '器物档案', score: 0, degraded: false }
  await f.assets.saveScholarArtifact(item); await f.assets.saveScholarArtifact(item)
  assert.equal(f.assets.localArtifacts().length, 1); assert.equal(f.requests.length, 0)
  f.login(1); assert.equal(f.assets.localArtifacts().length, 0)
  await f.assets.importGuestArchive()
  assert.equal(f.assets.localArtifacts('guest').length, 0)
  assert.equal(f.requests.filter(r => r[1] === '/api/deepseek/scholar/artifacts').length, 1)
})
test('guest completed games can be redrawn locally but never import credentials or points', async () => {
  const f = await fixture()
  const game = { id: webcrypto.randomUUID(), status: 'finished', settled: true, pointsAwarded: 3, guestKey: 'secret', winner: 'user', turns: [], endedAt: Date.now() }
  assert.equal(f.assets.rememberGuestGame({ ...game, status: 'playing' }), false)
  assert.equal(f.assets.rememberGuestGame(game), true)
  assert.equal(f.assets.rememberGuestGame(game), true)
  assert.equal(f.assets.guestGames().length, 1)
  assert.equal(f.assets.guestGames()[0].pointsAwarded, 0)
  assert.equal(f.assets.guestGames()[0].guestKey, undefined)
  f.login(1); assert.equal(f.assets.rememberGuestGame(game), false)
  await f.assets.importGuestArchive()
  assert.equal(f.requests.filter(r => r[1].includes('feihua')).length, 0)
})
test('more than twenty unsynced turns and more than one hundred guest assets are never silently truncated', async () => {
  const f = await fixture()
  for (let i = 0; i < 45; i++) assert.equal(f.letters.saveLocalTurn('libai', turn(i)), true)
  assert.equal(f.letters.cachedLetters()[0].turns.length, 45)
  for (let i = 0; i < 101; i++) await f.assets.saveScholarArtifact({ id: webcrypto.randomUUID(), name: `器物${i}`, description: '考释', score: 0, degraded: false })
  assert.equal(f.assets.localArtifacts().length, 101)
  for (let i = 0; i < 101; i++) f.assets.rememberGuestGame({ id: webcrypto.randomUUID(), status: 'finished', settled: true, turns: [], endedAt: Date.now() })
  assert.equal(f.assets.guestGames().length, 101)
  f.login(1)
  for (let i = 0; i < 45; i++) f.letters.saveLocalTurn('sushi', turn(i))
  await f.letters.syncLocalLetters()
  assert.equal(f.requests.find(r => r[1] === '/api/deepseek/scholar/sync')[2].turns.length, 45)
})
test('a failed pending upload never blocks cloud history reads', async () => {
  const f = await fixture(); f.login(1)
  f.letters.saveLocalTurn('libai', turn(0))
  f.transport.post = async () => { throw new Error('conflicting pending original') }
  f.transport.get = async () => ({ data: { data: [{ sageId: 'sushi', lastMsg: '真实云端对答', rounds: 3, at: Date.now() }] } })
  const rows = await f.letters.loadLetters()
  assert.ok(rows.some(row => row.sageId === 'sushi' && row.lastMsg === '真实云端对答'))
  assert.equal(rows.find(row => row.sageId === 'libai').turns[0].pending, true)
})
test('a late history snapshot retains a newly completed local turn and monotonic rounds', async () => {
  const f = await fixture(); f.login(1)
  const old = { ...turn(0), archiveSaved: true, at: Date.now() - 1000 }
  f.letters.saveLocalTurn('sushi', old)
  let resolve
  f.transport.get = () => new Promise(done => { resolve = done })
  const request = f.letters.loadLetterDetail('sushi')
  await new Promise(done => setImmediate(done))
  const fresh = { ...turn(0), archiveSaved: true }
  f.letters.saveLocalTurn('sushi', fresh)
  resolve({ data: { data: { sageId: 'sushi', rounds: 1, at: old.at, lastMsg: old.answer, turns: [old] } } })
  const detail = await request
  assert.ok(detail.turns.some(t => t.id === fresh.id)); assert.equal(detail.rounds, 2)
})
test('storage quota failure is reported without overwriting an existing original', async () => {
  const f = await fixture()
  f.letters.saveLocalTurn('libai', turn(0))
  f.localStorage.setItem = () => { throw new Error('quota') }
  assert.equal(f.letters.saveLocalTurn('libai', turn(1)), false)
  assert.equal(f.letters.cachedLetters()[0].turns.length, 1)
})
test('legacy local turns without archive flags remain eligible for safe idempotent upload', async () => {
  const f = await fixture(); f.login(1)
  const legacy = turn(0)
  f.localStorage.setItem('scholar-letters:v1:user:1', JSON.stringify([{ sageId: 'libai', rounds: 1, turns: [legacy] }]))
  await f.letters.syncLocalLetters()
  assert.equal(f.requests.find(r => r[1] === '/api/deepseek/scholar/sync')[2].turns[0].id, legacy.id)
  assert.equal(f.letters.cachedLetters()[0].turns[0].pending, false)
})
test('guest artifacts follow server field limits so malformed items cannot poison later import', async () => {
  const f = await fixture()
  const item = { id: webcrypto.randomUUID(), name: '建盏', description: '考释', score: 0, degraded: false }
  for (const invalid of [{ ...item, score: 101 }, { ...item, id: 'not-a-uuid' }, { ...item, name: '器'.repeat(101) }]) await assert.rejects(f.assets.saveScholarArtifact(invalid))
  assert.equal(f.assets.localArtifacts().length, 0)
})
test('native Canvas re-renders completed archive at Retina 2x with all text and seal curves', async () => {
  const text = [], curves = [], canvas = { toBlob: done => done(new Blob(['png'], { type: 'image/png' })) }
  const ctx = new Proxy({}, { get: (_, name) => name === 'fillText' ? value => text.push(value) : name === 'bezierCurveTo' ? (...args) => curves.push(args) : () => {}, set: () => true })
  canvas.getContext = () => ctx
  const doc = { fonts: { ready: Promise.resolve() }, createElement: () => canvas }
  const game = { id: webcrypto.randomUUID(), nickname: '零分文士', sageId: 'sushi', status: 'finished', settled: true, winner: 'user', pointsAwarded: 0, rounds: 1, keyword: '月', rhyme: '一东', endedAt: Date.now(), turns: [{ role: 'user', line: '明月几时有' }] }
  const result = await createScholarCertificate(game, doc)
  assert.equal(result.width, 1200); assert.ok(result.height >= 2160 && result.height % 2 === 0)
  assert.ok(text.includes('飞花通关文牒')); assert.ok(text.join('').includes('苏轼')); assert.ok(text.join('').includes('本局实记修持0分'))
  assert.ok(curves.length > 10)
  await assert.rejects(createScholarCertificate({ ...game, status: 'playing' }, doc), /结算/)
  await assert.rejects(createScholarCertificate({ ...game, turns: null }, doc), /不完整/)
})
