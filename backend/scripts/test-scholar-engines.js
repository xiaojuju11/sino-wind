const assert = require('node:assert/strict')
const { pathToFileURL } = require('node:url')
const path = require('node:path')
const Koa = require('koa')
const bodyParser = require('koa-bodyparser')
const db = require('../src/config/db')
const engine = require('../src/utils/feihuaEngine')
const controller = require('../src/controllers/feihuaController')
const { createScholarStream } = require('../src/utils/scholarSSE')
const { migrate } = require('./init-scholar-engines')
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let testUser, server
const gameIds = []
async function run() {
  assert.equal(engine.rhymeData.groups.length, 106)
  assert.ok(engine.rhymeGroups('床前明月光').includes('下平声七阳'))
  assert.ok(engine.rhymeGroups('举头望明月').includes('入声六月'))
  const initial = engine.createGame({}, 100)
  assert.throws(() => engine.createGame({ keyword: '月', rhyme: '上声一董' }, 100))
  assert.throws(() => engine.createGame({ sageId: '__proto__' }, 100))
  assert.equal(engine.move(initial, { action: 'timeout' }, 30099).game.status, 'playing')
  assert.equal(engine.move(initial, { action: 'submit', line: '举头望明月' }, 30100).game.winner, 'sage')
  assert.equal(engine.move(initial, { action: 'submit', line: '春眠不觉晓' }, 101).game.winner, 'sage')
  assert.equal(engine.move(initial, { action: 'submit', line: '我看月亮在天边' }, 101).changed, false)
  const first = engine.move(initial, { action: 'submit', line: '举头望明月' }, 101).game
  assert.equal(first.turns.length, 2)
  assert.equal(engine.move(first, { action: 'submit', line: '举头望明月。' }, 102).game.winner, 'sage')
  assert.equal(engine.move(first, { action: 'submit', line: '床前明月光' }, 102).game.winner, 'sage')
  assert.equal(initial.turns.length, 0)
  const lastRound = structuredClone(initial); lastRound.rounds = 5
  assert.equal(engine.move(lastRound, { action: 'submit', line: '举头望明月' }, 101).game.winner, 'draw')
  assert.equal(engine.points({ status: 'finished', winner: 'draw' }), 1)
  await migrate(); await migrate()
  const [inserted] = await db.execute('INSERT INTO users (phone,password_hash,nickname) VALUES (?,?,?)', ['QA' + Date.now(), 'test-only-not-a-login', '引擎临时验收'])
  testUser = inserted.insertId
  const ctx = body => ({ userId: testUser, ip: '127.0.0.1', request: { body } })
  let call = ctx({ keyword: '月', sageId: 'libai', rhyme: '入声六月' }); await controller.start(call)
  assert.equal(call.body.code, 1); let game = call.body.data; gameIds.push(game.id)
  const stranger = { userId: testUser + 1000000, request: { body: { id: game.id, version: 0, action: 'resign' } } }
  await controller.turn(stranger); assert.equal(stranger.status, 403)
  // A fixed near-exhausted corpus state isolates settlement from future corpus growth.
  const fixture = engine.createGame({ keyword: '月', rhyme: '入声六月' }, Date.now())
  fixture.turns = engine.poems.filter(p => p.line.includes('月') && engine.rhymeGroups(p.line).includes('入声六月') && p.line !== '海上生明月').map(p => ({ role: 'sage', ...p }))
  await db.execute('UPDATE feihua_games SET state=? WHERE id=?', [JSON.stringify(fixture), game.id])
  const finish = { id: game.id, version: game.version, action: 'submit', line: '海上生明月' }
  const repeats = await Promise.all(Array.from({ length: 4 }, async () => { const c = ctx(finish); await controller.turn(c); return c }))
  assert.ok(repeats.every(c => c.body.data.winner === 'user' && c.body.data.pointsAwarded === 3))
  const [[user]] = await db.execute('SELECT merit_points FROM users WHERE id=?', [testUser]); assert.equal(user.merit_points, 3)
  const guest = { ip: '127.0.0.2', request: { body: {} } }; await controller.start(guest); gameIds.push(guest.body.data.id)
  const denied = { request: { body: { id: guest.body.data.id, version: 0, action: 'resign', guestKey: 'a'.repeat(64) } } }
  await controller.turn(denied); assert.equal(denied.status, 403)
  const guestEnd = { request: { body: { id: guest.body.data.id, version: 0, action: 'resign', guestKey: guest.body.data.guestKey } } }
  await controller.turn(guestEnd); assert.equal(guestEnd.body.data.pointsAwarded, 0)
  await db.execute('UPDATE feihua_games SET expires_at=DATE_SUB(NOW(),INTERVAL 1 MINUTE) WHERE id=?', [guest.body.data.id])
  await controller.turn(guestEnd); assert.equal(guestEnd.status, 410)
  console.log('PASS: 106韵部、令字、重句、错韵、超时边界、纯状态机、迁移幂等、越权、游客和并发积分仅+3')

  const { createSSEParser } = await import(pathToFileURL(path.resolve(__dirname, '../../frontend/src/utils/scholarStream.js')).href)
  const collected = []
  const parser = createSSEParser((event, data) => collected.push([event, data]))
  const bytes = Buffer.from(': comment\r\nevent: delta\r\ndata: {"text":"山河𠮷"}\r\n\r\nevent: done\ndata: {}\n\n')
  const decoder = new TextDecoder('utf-8', { fatal: true })
  for (const byte of bytes) parser.push(decoder.decode(Uint8Array.of(byte), { stream: true }))
  parser.push(decoder.decode()); parser.finish()
  assert.equal(collected[0][1].text, '山河𠮷'); assert.equal(collected[1][0], 'done')
  const incomplete = createSSEParser(() => {}); incomplete.push('data: {'); assert.throws(() => incomplete.finish())
  let complete = false, counted = 0, cancelled = false
  const handler = createScholarStream({
    getClient: () => ({ chat: { completions: { create: async (body, { signal }) => {
      assert.equal(body.stream, true); signal.addEventListener('abort', () => { cancelled = true }, { once: true })
      return (async function * () {
        for (let i = 0; i < 8; i++) {
          await delay(15)
          if (signal.aborted) return
          yield { choices: [{ delta: { content: '清风明月共此时，山河有知音。' } }] }
        }
        complete = true
      })()
    } } } }), sages: { libai: { prompt: '诗酒对席' } },
    generateSageReply: () => '本地情境对答', sanitizeSageReply: value => value,
    db: { execute: async () => { counted++; return [{ affectedRows: 1 }] } }
  })
  const app = new Koa(); app.use(bodyParser()); app.use(async c => { c.userId = testUser; await handler(c) })
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  const response = await fetch(`http://127.0.0.1:${server.address().port}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sageId: 'libai', message: '共论明月' }) })
  assert.match(response.headers.get('content-type'), /text\/event-stream/)
  const reader = response.body.getReader(); let all = '', earlyDelta = false
  while (true) {
    const item = await reader.read(); if (item.done) break
    all += new TextDecoder().decode(item.value)
    if (all.includes('event: delta') && !complete) earlyDelta = true
  }
  assert.ok(earlyDelta); assert.ok(all.includes('event: done')); assert.equal(counted, 1)
  const abort = new AbortController()
  const pending = await fetch(`http://127.0.0.1:${server.address().port}`, { method: 'POST', signal: abort.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: '停止' }) })
  const pendingReader = pending.body.getReader(); await pendingReader.read(); cancelled = false; abort.abort(); await delay(50)
  assert.equal(cancelled, true)
  console.log('PASS: UTF-8逐字节、跨CRLF、注释、提前断线、真实HTTP增量早于生成结束、完成计数及取消上游')
}
run().catch(error => { console.error(error.stack); process.exitCode = 1 }).finally(async () => {
  server?.closeAllConnections(); server?.close()
  for (const id of gameIds) await db.execute('DELETE FROM feihua_games WHERE id=?', [id])
  if (testUser) await db.execute('DELETE FROM users WHERE id=?', [testUser])
  await db.end()
})
