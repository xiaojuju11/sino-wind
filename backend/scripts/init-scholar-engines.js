const db = require('../src/config/db')
async function migrate() {
  const [[column]] = await db.execute("SELECT COUNT(*) n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'merit_points'")
  if (!column.n) await db.execute('ALTER TABLE users ADD COLUMN merit_points INT UNSIGNED NOT NULL DEFAULT 0')
  await db.execute(`CREATE TABLE IF NOT EXISTS feihua_games (
    id CHAR(36) PRIMARY KEY, user_id INT NULL, guest_hash CHAR(64) NULL,
    state JSON NOT NULL, awarded_points INT NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX(user_id), INDEX(expires_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  console.log('先贤引擎数据库结构就绪：独立积分及飞花令对局；既有数据保留')
}
if (require.main === module) migrate().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => db.end())
module.exports = { migrate }
