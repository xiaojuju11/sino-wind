const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const Koa = require('koa'), Router = require('koa-router'), bodyParser = require('koa-bodyparser')
const db = require('../src/config/db'), jwt = require('jsonwebtoken')
const { optionalToken, JWT_SECRET } = require('../src/utils/jwt')
const artifacts = require('../src/controllers/scholarArtifactController')
const { saveTurn } = require('../src/utils/scholarLetters')
const { migrate } = require('./init-scholar-ecosystem')
const { createScholarStream } = require('../src/utils/scholarSSE')
let userId, server, lastMessages
async function run() {
  await migrate(); await migrate()
  const [insert] = await db.execute('INSERT INTO users(phone,password_hash,nickname) VALUES (?,?,?)', ['QA' + Date.now(), 'test-only-not-a-login', '携物临时验收']); userId = insert.insertId
  const token = jwt.sign({ id: userId }, JWT_SECRET), other = jwt.sign({ id: userId + 999999 }, JWT_SECRET)
  const stream = createScholarStream({
    sages: { libai: { prompt: '唐代李白，茶器辨析' } }, db, saveTurn, loadArtifact: artifacts.loadArtifact,
    generateSageReply: () => '本机降级', sanitizeSageReply: value => value,
    getClient: () => ({ chat: { completions: { create: async params => {
      lastMessages = params.messages
      return (async function * () { for (let i = 0; i < 6; i++) yield { choices: [{ delta: { content: '器用随时而变，此物年代未定，且据文献与君审辨，勿以推论当作亲历。' } }] } })()
    } } } })
  })
  const mock = new Router(); mock.post('/api/deepseek/chat/stream', optionalToken(), stream)
  const routes = require('../src/routes/deepseek-api')
  const app = new Koa(); app.use(bodyParser()).use(mock.routes()).use(routes.routes()).use(routes.allowedMethods())
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  const root = `http://127.0.0.1:${server.address().port}/api/deepseek`
  const call = (path, body, credential = token, method = body ? 'POST' : 'GET') => fetch(root + path, { method, headers: { ...(credential ? { Authorization: `Bearer ${credential}` } : {}), 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) })
  assert.equal((await call('/scholar/artifacts', null, '')).status, 416)
  assert.equal((await call('/feihua/records', null, '')).status, 416)
  const id = randomUUID(), payload = { id, name: '建盏', dynasty: '宋（待考）', description: '茶盏文化研习记录。', score: 80, degraded: false }
  assert.equal((await call('/scholar/artifacts', { ...payload, score: 101 })).status, 400)
  for (let i = 0; i < 3; i++) assert.equal((await call('/scholar/artifacts', payload)).status, 200)
  let list = await (await call('/scholar/artifacts')).json(); assert.equal(list.data.total, 1)
  assert.equal((await call('/scholar/artifacts', payload, other)).status, 409)
  assert.equal((await call('/chat/stream', { message: '请辨析器物', artifactId: id }, other)).status, 404)
  assert.equal((await call('/chat/stream', { message: '请辨析器物', artifactId: id }, '')).status, 401)
  const requestId = randomUUID()
  for (let i = 0; i < 4; i++) {
    const response = await call('/chat/stream', { message: '太白兄，请辨析宋代建盏与唐代茶器的不同', sageId: 'libai', artifactId: id, requestId: i ? randomUUID() : requestId })
    assert.match(response.headers.get('content-type'), /text\/event-stream/)
    const body = await response.text(); assert.match(body, /event: delta/); assert.match(body, /"archiveSaved":true/)
  }
  assert.ok(lastMessages[0].content.includes('跨时推论'))
  assert.ok(lastMessages.at(-1).content.includes('茶盏文化研习记录'))
  assert.ok(lastMessages.at(-1).content.includes('宋（待考）'))
  const saved = await (await call('/scholar/letters/libai')).json(); assert.equal(saved.data.turns.length, 4)
  const leave = await (await call('/scholar/letters/libai/leave', {})).json(); assert.ok(leave.data.id)
  const rows = await (await call('/scholar/letters')).json(); assert.equal(rows.data[0].reply.unread, true)
  assert.equal((await call('/scholar/letters/libai/read', { replyId: leave.data.id })).status, 200)
  assert.equal((await call(`/scholar/artifacts/${id}`, null, other, 'DELETE')).status, 404)
  assert.equal((await call(`/scholar/artifacts/${id}`, null, token, 'DELETE')).status, 200)
  list = await (await call('/scholar/artifacts')).json(); assert.equal(list.data.total, 0)
  console.log('PASS 真实HTTP：登录拦截、藏品参数/重复保存/归属隔离、藏品上下文进入SSE、完整流归档、离席回柬与已阅、删除；上游为确定性测试替身，不声称真实模型考证')
}
run().catch(e => { console.error(e); process.exitCode = 1 }).finally(async () => {
  if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
  if (userId) for (const table of ['scholar_turns','scholar_conversations','scholar_artifacts']) await db.execute(`DELETE FROM ${table} WHERE user_id=?`, [userId])
  if (userId) await db.execute('DELETE FROM users WHERE id=?', [userId])
  await db.end()
})
