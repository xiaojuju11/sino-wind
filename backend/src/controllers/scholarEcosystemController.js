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
module.exports = { list, detail, leave, read }
