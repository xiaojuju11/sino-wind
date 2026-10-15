// Add the missing asset counter and correct defaults for future accounts only.
// Existing account values, assets and competitive settlements are never reset.
const db = require('../src/config/db')
async function migrate() {
  await require('./init-scholar-ecosystem').migrate()
  const [rows] = await db.execute("SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='users'")
  const names = new Set(rows.map(row => row.COLUMN_NAME))
  if (!names.size) throw new Error('请先初始化 users 基础表')
  for (const name of ['appraise_count', 'debate_count', 'poem_count']) {
    if (names.has(name)) await db.execute(`ALTER TABLE users ALTER COLUMN ${name} SET DEFAULT 0`)
  }
  if (!names.has('yayan_count')) await db.execute('ALTER TABLE users ADD COLUMN yayan_count INT UNSIGNED NOT NULL DEFAULT 0')
  console.log('今日知音生态迁移完成：新用户计数默认零、雅译计数列就绪；既有资产与积分保留')
}
if (require.main === module) migrate().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => db.end())
module.exports = { migrate }
