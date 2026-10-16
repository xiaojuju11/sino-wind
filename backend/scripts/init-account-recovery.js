const db = require('../src/config/db')

async function migrate() {
  const [rows] = await db.execute('SHOW FULL COLUMNS FROM users')
  const accountColumn = rows.find(row => row.Field === 'phone')
  const accountLength = /^varchar\((\d+)\)$/i.exec(accountColumn?.Type || '')
  if (!accountLength || !/^[a-zA-Z0-9_]+$/.test(accountColumn.Collation || '')) throw new Error('users.phone 字段结构异常，请确认原账号字段类型后再迁移')
  if (Number(accountLength[1]) < 254) {
    // The existing field also holds email logins. Widen it without changing case-insensitive uniqueness.
    const charset = accountColumn.Collation.split('_')[0]
    await db.execute(`ALTER TABLE users MODIFY COLUMN phone VARCHAR(254) CHARACTER SET ${charset} COLLATE ${accountColumn.Collation} ${accountColumn.Null === 'YES' ? 'NULL' : 'NOT NULL'}`)
  }
  const columns = new Set(rows.map(row => row.Field))
  for (const [name, sql] of [
    ['recovery_code_hash', 'ALTER TABLE users ADD COLUMN recovery_code_hash CHAR(64) NULL'],
    ['auth_version', 'ALTER TABLE users ADD COLUMN auth_version INT UNSIGNED NOT NULL DEFAULT 0'],
  ]) {
    if (!columns.has(name)) {
      try { await db.execute(sql) } catch (error) { if (error.code !== 'ER_DUP_FIELDNAME') throw error }
    }
  }
  await db.execute(`CREATE TABLE IF NOT EXISTS auth_recovery_attempts (
    key_hash CHAR(64) PRIMARY KEY, window_start DATETIME(3) NOT NULL,
    attempts INT UNSIGNED NOT NULL DEFAULT 1, INDEX(window_start)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  console.log('账号恢复码结构就绪；既有账号与业务数据保留')
}

if (require.main === module) migrate().catch(error => { console.error(error.message); process.exitCode = 1 }).finally(() => db.end())
module.exports = { migrate }
