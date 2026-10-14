const db = require('../config/db')
const { randomUUID } = require('node:crypto')
const validSage = value => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(value)
const STYLES = {
  libai: '太白携月举觞，遥寄清风。愿足下心有长空，行路莫惧风雨。',
  sushi: '东坡烹茶相候，寄君一味清欢。归途纵有烟雨，且作寻常看。',
  liqingzhao: '易安展笺，念君清谈余韵。愿以一枝花影，伴君灯下读书。',
  wangyangming: '守仁寄言：心之所向，当在事上磨炼。愿君知行相资，不负此番对席。',
  dufu: '子美拂笺，惟愿君安。文章之外，更念苍生；且惜眼前灯火。'
}
const makeReply = (sageId, question) => `${STYLES[sageId] || '山水相逢，墨香不散。愿足下珍重，改日续谈。'}\n\n君前言「${Array.from(question).slice(0, 48).join('')}」，余意未尽，待君再叙。`
async function saveTurn({ userId, sageId, requestId, question, answer, degraded }) {
  if (!userId || !validSage(sageId)) return false
  let connection
  try {
    connection = await db.getConnection(); await connection.beginTransaction()
    const now = new Date()
    // Lock the summary row before inserting: completion and leave serialize per sage.
    await connection.execute('INSERT IGNORE INTO scholar_conversations(user_id,sage_id,last_message,updated_at) VALUES (?,?,?,?)', [userId, sageId, '', now])
    await connection.execute('SELECT rounds FROM scholar_conversations WHERE user_id=? AND sage_id=? FOR UPDATE', [userId, sageId])
    const [added] = await connection.execute('INSERT IGNORE INTO scholar_turns(user_id,request_id,sage_id,question,answer,degraded,created_at) VALUES (?,?,?,?,?,?,?)', [userId, requestId, sageId, question.slice(0, 2000), answer.slice(0, 4000), degraded ? 1 : 0, now])
    if (added.affectedRows) await connection.execute('UPDATE scholar_conversations SET rounds=rounds+1,last_message=?,updated_at=? WHERE user_id=? AND sage_id=?', [answer.slice(0, 4000), now, userId, sageId])
    await connection.commit(); return true
  } catch { if (connection) await connection.rollback().catch(() => {}); return false }
  finally { connection?.release() }
}
async function leave(userId, sageId) {
  const connection = await db.getConnection()
  try {
    await connection.beginTransaction()
    const [[row]] = await connection.execute('SELECT * FROM scholar_conversations WHERE user_id=? AND sage_id=? FOR UPDATE', [userId, sageId])
    if (!row || row.rounds < 4 || row.rounds - row.leave_rounds < 4) { await connection.commit(); return null }
    const [[turn]] = await connection.execute('SELECT question FROM scholar_turns WHERE user_id=? AND sage_id=? ORDER BY created_at DESC,request_id DESC LIMIT 1', [userId, sageId])
    const letter = { id: randomUUID(), text: makeReply(sageId, turn?.question || '云山旧话'), at: new Date(), kind: '规则回柬' }
    await connection.execute('UPDATE scholar_conversations SET leave_rounds=rounds,reply_id=?,reply_text=?,reply_at=?,reply_unread=1 WHERE user_id=? AND sage_id=?', [letter.id, letter.text, letter.at, userId, sageId])
    await connection.commit(); return letter
  } catch (e) { await connection.rollback(); throw e }
  finally { connection.release() }
}
module.exports = { validSage, makeReply, saveTurn, leave }
