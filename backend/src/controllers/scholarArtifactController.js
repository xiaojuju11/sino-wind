const { randomUUID } = require('node:crypto')
const db = require('../config/db')
const validId = value => typeof value === 'string' && /^[0-9a-f-]{36}$/i.test(value)
const publicArtifact = row => ({ id: row.id, name: row.name, dynasty: row.dynasty, description: row.description, score: row.score, degraded: Boolean(row.degraded), at: new Date(row.created_at).getTime() })
async function loadArtifact(userId, id) {
  const [[row]] = await db.execute({ sql: 'SELECT * FROM scholar_artifacts WHERE id=? AND user_id=?', timeout: 3000 }, [id, userId])
  return row ? publicArtifact(row) : null
}
async function list(ctx) {
  const page = Number(ctx.query.page || 1)
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000) { ctx.status = 400; ctx.body = { code: 0, message: '页码无效' }; return }
  try {
    const [rows] = await db.execute(`SELECT * FROM scholar_artifacts WHERE user_id=? ORDER BY created_at DESC,id DESC LIMIT 12 OFFSET ${(page - 1) * 12}`, [ctx.userId])
    const [[count]] = await db.execute('SELECT COUNT(*) total FROM scholar_artifacts WHERE user_id=?', [ctx.userId])
    ctx.body = { code: 1, data: { artifacts: rows.map(publicArtifact), total: count.total, page, pageSize: 12 } }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '宝鉴藏品暂未载入，请确认生态迁移已运行' } }
}
async function save(ctx) {
  const { name, dynasty = '', description, score, degraded } = ctx.request.body || {}
  const id = ctx.request.body?.id || randomUUID()
  if (!validId(id) || typeof name !== 'string' || !name.trim() || name.length > 100 || typeof dynasty !== 'string' || dynasty.length > 80 || typeof description !== 'string' || !description.trim() || description.length > 8000 || typeof degraded !== 'boolean' || (!degraded && (!Number.isFinite(score) || score < 0 || score > 100))) {
    ctx.status = 400; ctx.body = { code: 0, message: '藏品名称、年代或考释内容无效' }; return
  }
  try {
    await db.execute('INSERT INTO scholar_artifacts(id,user_id,name,dynasty,description,score,degraded) VALUES (?,?,?,?,?,?,?) ON DUPLICATE KEY UPDATE id=id', [id, ctx.userId, name.trim(), dynasty, description, degraded ? null : score, degraded ? 1 : 0])
    const artifact = await loadArtifact(ctx.userId, id)
    if (!artifact) { ctx.status = 409; ctx.body = { code: 0, message: '藏品编号冲突，请重试' }; return }
    ctx.body = { code: 1, data: artifact }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '藏品尚未保存，请检查数据库迁移后重试' } }
}
async function remove(ctx) {
  if (!validId(ctx.params.id)) { ctx.status = 400; ctx.body = { code: 0, message: '藏品编号无效' }; return }
  try {
    const [result] = await db.execute('DELETE FROM scholar_artifacts WHERE id=? AND user_id=?', [ctx.params.id, ctx.userId])
    if (!result.affectedRows) { ctx.status = 404; ctx.body = { code: 0, message: '未找到此藏品' }; return }
    ctx.body = { code: 1 }
  } catch { ctx.status = 503; ctx.body = { code: 0, message: '暂未移出宝鉴' } }
}
module.exports = { list, save, remove, loadArtifact, validId }
