const { randomUUID, randomBytes, createHash } = require('node:crypto')
const db = require('../config/db')
const engine = require('../utils/feihuaEngine')
const hash = value => createHash('sha256').update(value).digest('hex')
const limits = new Map()
const publicGame = (id, state, extra = {}) => ({ id, ...state, serverNow: Date.now(), ...extra })
function allowStart(ip) {
  const now = Date.now(), entry = limits.get(ip)
  if (limits.size > 4096) limits.delete(limits.keys().next().value)
  if (!entry || now - entry.time > 60000) { limits.set(ip, { time: now, count: 1 }); return true }
  return ++entry.count <= 10
}
async function start(ctx) {
  if (!allowStart(ctx.ip)) { ctx.status = 429; ctx.body = { code: 0, message: '开局过于频繁，请稍候' }; return }
  let state
  try {
    let nickname = '未登录雅士'
    if (ctx.userId) {
      const [[user]] = await db.execute('SELECT nickname FROM users WHERE id=?', [ctx.userId])
      if (!user) { ctx.status = 401; ctx.body = { code: 0, message: '请重新入席' }; return }
      nickname = user.nickname
    }
    state = engine.createGame({ ...ctx.request.body, nickname }, Date.now())
  } catch (e) { ctx.status = 400; ctx.body = { code: 0, message: e.message }; return }
  const id = randomUUID(), guestKey = ctx.userId ? null : randomBytes(32).toString('hex')
  try {
    await db.execute('INSERT INTO feihua_games (id,user_id,guest_hash,state,expires_at) VALUES (?,?,?,?,?)', [id, ctx.userId || null, guestKey ? hash(guestKey) : null, JSON.stringify(state), new Date(Date.now() + 15 * 60000)])
    ctx.body = { code: 1, data: publicGame(id, state, { guestKey, pointsAwarded: 0, settled: false }) }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '对弈数据库未就绪，请先执行先贤引擎迁移脚本' } }
}
async function turn(ctx) {
  const { id, version, guestKey, action, line } = ctx.request.body || {}
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id) || !Number.isSafeInteger(version) || !['submit', 'timeout', 'resign'].includes(action) || (action === 'submit' && (typeof line !== 'string' || line.length > 100))) { ctx.status = 400; ctx.body = { code: 0, message: '对局参数无效' }; return }
  let connection
  try {
    connection = await db.getConnection(); await connection.beginTransaction()
    const [[row]] = await connection.execute('SELECT * FROM feihua_games WHERE id=? FOR UPDATE', [id])
    if (!row || (row.user_id ? row.user_id !== ctx.userId : typeof guestKey !== 'string' || guestKey.length !== 64 || hash(guestKey) !== row.guest_hash)) {
      await connection.rollback(); ctx.status = 403; ctx.body = { code: 0, message: '无权访问此对局' }; return
    }
    if (new Date(row.expires_at).getTime() < Date.now()) { await connection.rollback(); ctx.status = 410; ctx.body = { code: 0, message: '此局已过期，请重新开局' }; return }
    const previous = typeof row.state === 'string' ? JSON.parse(row.state) : row.state
    if (previous.version !== version || previous.status === 'finished') {
      await connection.commit()
      ctx.body = { code: 1, data: publicGame(id, previous, { pointsAwarded: row.awarded_points, settled: previous.status === 'finished', feedback: '对局状态已同步' }) }; return
    }
    const result = engine.move(previous, { action, line }, Date.now())
    let awarded = row.awarded_points
    if (result.changed) {
      if (result.game.status === 'finished' && ctx.userId) {
        awarded = engine.points(result.game)
        if (awarded) {
          const [updated] = await connection.execute('UPDATE users SET merit_points=merit_points+? WHERE id=?', [awarded, ctx.userId])
          if (updated.affectedRows !== 1) throw new Error('积分账户不存在')
        }
      }
      await connection.execute('UPDATE feihua_games SET state=?,awarded_points=? WHERE id=?', [JSON.stringify(result.game), awarded, id])
    }
    await connection.commit()
    ctx.body = { code: 1, data: publicGame(id, result.game, { pointsAwarded: awarded, settled: result.game.status === 'finished', feedback: result.feedback || '' }) }
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {})
    ctx.status = 503; ctx.body = { code: 0, message: '对局暂未保存，积分不会重复结算，请重试' }
  } finally { connection?.release() }
}
async function rules(ctx) {
  const availableRhymes = Object.fromEntries(engine.KEYWORDS.map(key => [key, [...new Set(engine.poems.filter(p => p.line.includes(key)).flatMap(p => engine.rhymeGroups(p.line)))]]))
  ctx.body = { code: 1, data: { keywords: engine.KEYWORDS, rhymes: engine.rhymeData.groups.map(g => g.name), availableRhymes, poems: engine.poems, seconds: 30, maxRounds: 6, winPoints: 3, drawPoints: 1, source: engine.rhymeData.source } }
}
module.exports = { start, turn, rules }
