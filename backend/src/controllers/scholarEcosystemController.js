const db = require('../config/db')
const letters = require('../utils/scholarLetters')
const asLetter = row => ({ sageId: row.sage_id, lastMsg: row.last_message, at: new Date(row.updated_at).getTime(), rounds: row.rounds, reply: row.reply_id ? { id: row.reply_id, text: row.reply_text, at: new Date(row.reply_at).getTime(), unread: Boolean(row.reply_unread), kind: '规则回柬' } : null })
async function list(ctx) {
  try {
    const [rows] = await db.execute('SELECT * FROM scholar_conversations WHERE user_id=? ORDER BY GREATEST(updated_at,COALESCE(reply_at,updated_at)) DESC LIMIT 100', [ctx.userId])
    ctx.body = { code: 1, data: rows.map(asLetter) }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '信札库暂未就绪，请先运行知音生态迁移脚本' } }
}
async function detail(ctx) {
  if (!letters.validSage(ctx.params.sageId)) { ctx.status = 400; ctx.body = { code: 0, message: '先贤编号无效' }; return }
  try {
    const [[row]] = await db.execute('SELECT * FROM scholar_conversations WHERE user_id=? AND sage_id=?', [ctx.userId, ctx.params.sageId])
    const [turns] = await db.execute('SELECT request_id,question,answer,degraded,created_at FROM scholar_turns WHERE user_id=? AND sage_id=? ORDER BY created_at DESC,request_id DESC LIMIT 20', [ctx.userId, ctx.params.sageId])
    ctx.body = { code: 1, data: { ...(row ? asLetter(row) : { sageId: ctx.params.sageId, rounds: 0 }), turns: turns.reverse().map(t => ({ id: t.request_id, question: t.question, answer: t.answer, degraded: Boolean(t.degraded), at: new Date(t.created_at).getTime() })) } }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '对席记录暂未载入' } }
}
async function leave(ctx) {
  if (!letters.validSage(ctx.params.sageId)) { ctx.status = 400; ctx.body = { code: 0, message: '先贤编号无效' }; return }
  try { ctx.body = { code: 1, data: await letters.leave(ctx.userId, ctx.params.sageId) } }
  catch { ctx.status = 503; ctx.body = { code: 0, message: '回柬暂未寄出，稍后可再离席触发' } }
}
async function read(ctx) {
  const id = ctx.request.body?.replyId
  if (!letters.validSage(ctx.params.sageId) || typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) { ctx.status = 400; ctx.body = { code: 0, message: '回柬编号无效' }; return }
  try {
    await db.execute('UPDATE scholar_conversations SET reply_unread=0 WHERE user_id=? AND sage_id=? AND reply_id=?', [ctx.userId, ctx.params.sageId, id])
    ctx.body = { code: 1 }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '回柬暂未标记已阅' } }
}
// Local records are personal archive material, never evidence for competitive points.
async function sync(ctx) {
  const turns = ctx.request.body?.turns
  if (!Array.isArray(turns) || turns.length > 100 || turns.some(t => !t || !letters.validSage(t.sageId) || typeof t.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(t.id) || typeof t.question !== 'string' || !t.question.trim() || t.question.length > 2000 || typeof t.answer !== 'string' || !t.answer.trim() || t.answer.length > 4000 || !Number.isSafeInteger(t.at) || t.at < 946684800000 || t.at > Date.now() + 60000)) {
    ctx.status = 400; ctx.body = { code: 0, message: '本机信札参数无效，每次最多补传100轮' }; return
  }
  try {
    const [[user]] = await db.execute('SELECT id FROM users WHERE id=?', [ctx.userId])
    if (!user) { ctx.status = 401; ctx.body = { code: 0, message: '请重新入席' }; return }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '账户暂未确认，本机原稿保留' }; return }
  const accepted = []
  for (const t of [...turns].sort((a, b) => a.at - b.at)) {
    const saved = await letters.saveTurn({ userId: ctx.userId, sageId: t.sageId, requestId: t.id, question: t.question, answer: t.answer, degraded: true, at: t.at })
    if (!saved) { ctx.status = 409; ctx.body = { code: 0, message: '部分信札尚未入库，本机原稿保留，可重试', accepted }; return }
    accepted.push(t.id)
  }
  ctx.body = { code: 1, data: { accepted, pointsAwarded: 0 } }
}
async function summary(ctx) {
  try {
    const [[user]] = await db.execute('SELECT * FROM users WHERE id=?', [ctx.userId])
    if (!user) { ctx.status = 401; ctx.body = { code: 0, message: '请重新入席' }; return }
    const [[artifacts]] = await db.execute('SELECT COUNT(*) n FROM scholar_artifacts WHERE user_id=?', [ctx.userId])
    const [[turns]] = await db.execute('SELECT COUNT(*) n FROM scholar_turns WHERE user_id=?', [ctx.userId])
    const [[poems]] = await db.execute('SELECT COUNT(*) n FROM user_poems WHERE user_id=?', [ctx.userId])
    const count = value => Math.max(0, Number(value) || 0)
    ctx.body = { code: 1, data: { nickname: user.nickname, avatar: user.avatar, appraise_count: count(artifacts.n), artifact_count: count(artifacts.n), debate_count: count(turns.n), poem_count: count(poems.n), yayan_count: count(user.yayan_count) } }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '修持档案暂未就绪，请重试' } }
}
module.exports = { list, detail, leave, read, sync, summary }
