const assert = require('node:assert/strict')
const { randomUUID } = require('node:crypto')
const db = require('../src/config/db')
const engine = require('../src/utils/feihuaEngine')
const games = require('../src/controllers/feihuaController')
let userId
const ids = []
async function run() {
  for (const [score, expected] of [[0,'白衣布衣'],[5,'白衣布衣'],[6,'秀才 / 茂才'],[15,'秀才 / 茂才'],[16,'举人 / 乡贡'],[30,'举人 / 乡贡'],[31,'贡士'],[60,'贡士'],[61,'同进士出身'],[100,'同进士出身'],[101,'进士及第'],[150,'进士及第'],[151,'翰林大学士']]) assert.equal(engine.scholarRank(score), expected)
  const [inserted] = await db.execute('INSERT INTO users(phone,password_hash,nickname) VALUES (?,?,?)', ['QA' + Date.now(), 'test-only-not-a-login', '生态临时验收'])
  userId = inserted.insertId
  for (let i = 0; i < 3; i++) {
    const id = randomUUID(); ids.push(id)
    const state = { ...engine.createGame({}, Date.now()), status: i === 2 ? 'playing' : 'finished', winner: 'sage', endedAt: 1000 + i, rounds: 0 }
    await db.execute('INSERT INTO feihua_games(id,user_id,state,expires_at) VALUES (?,?,?,?)', [id, userId, JSON.stringify(state), new Date(0)])
  }
  const list = { userId, query: { page: '1', pageSize: '1' } }; await games.records(list)
  assert.equal(list.body.data.total, 2); assert.equal(list.body.data.records[0].id, ids[1])
  const second = { userId, query: { page: '2', pageSize: '1' } }; await games.records(second)
  assert.equal(second.body.data.records[0].id, ids[0])
  const detail = { userId, params: { id: ids[0] } }; await games.record(detail)
  assert.equal(detail.body.data.id, ids[0]); assert.equal(detail.body.data.settled, true)
  const denied = { userId: userId + 999999, params: { id: ids[0] } }; await games.record(denied); assert.equal(denied.status, 404)
  const bad = { userId, query: { page: '1 OR 1', pageSize: '100' } }; await games.records(bad); assert.equal(bad.status, 400)
  console.log('PASS 文阶全部边界、已完成历史分页倒序、过期回看、未完局排除、跨账户隔离、非法分页拒绝')
}
run().catch(e => { console.error(e); process.exitCode = 1 }).finally(async () => {
  for (const id of ids) await db.execute('DELETE FROM feihua_games WHERE id=?', [id])
  if (userId) await db.execute('DELETE FROM users WHERE id=?', [userId])
  await db.end()
})
