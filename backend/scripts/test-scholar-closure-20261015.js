const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const Koa = require('koa'), bodyParser = require('koa-bodyparser'), jwt = require('jsonwebtoken')
const db = require('../src/config/db')
const { JWT_SECRET } = require('../src/utils/jwt')
const { migrate } = require('./init-scholar-20261015')
const users = [], games = []
let server
async function run() {
  await migrate()
  for (const name of ['闭环测试甲', '闭环测试乙']) {
    const [row] = await db.execute('INSERT INTO users(phone,password_hash,nickname) VALUES (?,?,?)', ['QA' + randomUUID().slice(0, 16), 'test-only-not-a-login', name])
    users.push(row.insertId)
  }
  const tokens = users.map(id => jwt.sign({ id }, JWT_SECRET))
  const routes = require('../src/routes/deepseek-api')
  const app = new Koa(); app.use(bodyParser()).use(routes.routes()).use(routes.allowedMethods())
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/deepseek`
  const call = async (path, data, token = tokens[0], method = data ? 'POST' : 'GET') => {
    const res = await fetch(root + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(data ? { body: JSON.stringify(data) } : {}) })
    return { status: res.status, ...(await res.json()) }
  }
  assert.equal((await call('/scholar/summary', null, '')).status, 416)
  const zero = (await call('/scholar/summary')).data
  for (const key of ['appraise_count', 'artifact_count', 'debate_count', 'poem_count', 'yayan_count']) assert.equal(zero[key], 0)
  assert.equal((await call('/scholar/sync', { turns: [{ id: 'bad' }] })).status, 400)
  const turns = Array.from({ length: 4 }, (_, i) => ({ id: randomUUID(), sageId: 'libai', question: `月下问${i}`, answer: `太白答${i}`, at: Date.now() - (5 - i) * 1000 }))
  for (const result of await Promise.all([call('/scholar/sync', { turns }), call('/scholar/sync', { turns })])) assert.equal(result.code, 1, JSON.stringify(result))
  let detail = (await call('/scholar/letters/libai')).data
  assert.equal(detail.rounds, 4); assert.equal(detail.turns.length, 4)
  assert.equal(detail.lastMsg, '太白答3'); assert.equal(detail.turns[0].at, turns[0].at)
  assert.ok(detail.turns.every(t => t.degraded)) // Local imports cannot masquerade as verified live output.
  const older = { id: randomUUID(), sageId: 'libai', question: '更早问题', answer: '更早回答', at: turns[0].at - 1000 }
  assert.equal((await call('/scholar/sync', { turns: [older] })).code, 1)
  detail = (await call('/scholar/letters/libai')).data
  assert.equal(detail.lastMsg, '太白答3'); assert.equal(detail.rounds, 5)
  assert.equal((await call('/scholar/sync', { turns: [{ ...turns[0], sageId: 'sushi' }] })).status, 409)
  assert.equal((await call('/scholar/letters/sushi')).data.rounds, 0)
  assert.equal((await call('/scholar/letters/libai', null, tokens[1])).data.turns.length, 0)
  const replies = await Promise.all([call('/scholar/letters/libai/leave', {}), call('/scholar/letters/libai/leave', {})])
  assert.equal(replies.filter(r => r.data?.id).length, 1)
  const letter = (await call('/scholar/letters')).data[0]
  assert.equal(letter.reply.unread, true)
  await call('/scholar/letters/libai/read', { replyId: randomUUID() })
  assert.equal((await call('/scholar/letters')).data[0].reply.unread, true)
  await call('/scholar/letters/libai/read', { replyId: letter.reply.id })
  assert.equal((await call('/scholar/letters')).data[0].reply.unread, false)
  const artifact = { id: randomUUID(), name: '建盏', dynasty: '宋（待考）', description: '真实接口测试用考释。', score: 0, degraded: false }
  await Promise.all([call('/scholar/artifacts', artifact), call('/scholar/artifacts', artifact)])
  assert.equal((await call('/scholar/artifacts')).data.total, 1)
  assert.equal((await call('/scholar/artifacts', artifact, tokens[1])).status, 409)
  assert.equal((await call(`/scholar/artifacts/${artifact.id}`, null, tokens[1], 'DELETE')).status, 404)
  const summary = (await call('/scholar/summary')).data
  assert.equal(summary.artifact_count, 1); assert.equal(summary.debate_count, 5)
  // A settled fixture exercises the unmodified owner's records API; no algorithm is changed.
  const id = randomUUID(); games.push(id)
  const state = { status: 'finished', winner: 'user', sageId: 'libai', keyword: '月', rhyme: '上平一东', rounds: 1, turns: [{ role: 'user', line: '床前明月光' }], endedAt: Date.now() }
  await db.execute('INSERT INTO feihua_games(id,user_id,state,awarded_points,expires_at) VALUES (?,?,?,?,?)', [id, users[0], JSON.stringify(state), 3, new Date(Date.now() + 60000)])
  await db.execute('UPDATE users SET merit_points=3 WHERE id=?', [users[0]])
  const records = (await call('/feihua/records')).data
  assert.equal(records.total, 1); assert.equal(records.meritPoints, 3); assert.equal(records.rank, '白衣布衣')
  assert.equal((await call(`/feihua/records/${id}`)).data.settled, true)
  assert.equal((await call(`/feihua/records/${id}`, null, tokens[1])).status, 404)
  await call('/scholar/sync', { turns })
  assert.equal((await call('/feihua/records')).data.meritPoints, 3)
  console.log('PASS: real HTTP + MySQL: zero counters, local retry idempotency/concurrency, chronological merge, identity isolation, leave/read receipt, artifact deduplication/ownership, five-axis sources and unchanged records API; imports award zero merit.')
}
run().catch(e => { console.error(e); process.exitCode = 1 }).finally(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  for (const id of games) await db.execute('DELETE FROM feihua_games WHERE id=?', [id])
  for (const id of users) {
    for (const table of ['scholar_turns', 'scholar_conversations', 'scholar_artifacts']) await db.execute(`DELETE FROM ${table} WHERE user_id=?`, [id])
    await db.execute('DELETE FROM users WHERE id=?', [id])
  }
  await db.end()
})
