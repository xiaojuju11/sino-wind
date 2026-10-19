const mysql = require('mysql2/promise')
const path = require('path')
const bcrypt = require('bcrypt')
require('dotenv').config({ path: [path.resolve(__dirname, '../.env.local'), path.resolve(__dirname, '../.env')] })

async function seed() {
  const host = process.env.DB_HOST || 'localhost'
  const user = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''
  const port = Number(process.env.DB_PORT || 3306)
  const dbName = process.env.DB_NAME || 'parent_kid_education'

  console.log(`[Seed] 正在连接 MySQL (${host}:${port}/${dbName})...`)
  let connection
  try {
    connection = await mysql.createConnection({ host, user, password, port, database: dbName })
    console.log('[Seed] 成功连接数据库！')
  } catch (err) {
    console.error('[Seed] 连接失败：', err.message)
    process.exit(1)
  }

  try {
    const passwordHash = await bcrypt.hash('123456', 10)
    const demoUsers = [
      {
        phone: '15779889503',
        nickname: '小橘宝宝',
        passwordHash,
        rank_level: '玖阶',
        merit_points: 100
      },
      {
        phone: '13800000000',
        nickname: '墨韵雅士',
        passwordHash,
        rank_level: '玖阶',
        merit_points: 100
      }
    ]

    for (const u of demoUsers) {
      const [rows] = await connection.execute('SELECT id FROM users WHERE phone=? LIMIT 1', [u.phone])
      if (rows.length > 0) {
        await connection.execute(
          'UPDATE users SET password_hash=?, nickname=?, rank_level=?, merit_points=?, auth_version=0 WHERE id=?',
          [u.passwordHash, u.nickname, u.rank_level, u.merit_points, rows[0].id]
        )
        console.log(`[Seed] 用户 [${u.phone}] (${u.nickname}) 密码与信息已更新为 123456 (id=${rows[0].id})`)
      } else {
        const [res] = await connection.execute(
          'INSERT INTO users (phone, password_hash, nickname, rank_level, merit_points, auth_version) VALUES (?, ?, ?, ?, ?, 0)',
          [u.phone, u.passwordHash, u.nickname, u.rank_level, u.merit_points]
        )
        console.log(`[Seed] 新增测试用户 [${u.phone}] (${u.nickname})，密码: 123456 (id=${res.insertId})`)
      }
    }
    console.log('[Seed] 演示账号初始化完毕！可通过 15779889503 / 123456 或 13800000000 / 123456 登录。')
  } catch (err) {
    console.error('[Seed] 执行失败：', err.message)
    process.exit(1)
  } finally {
    await connection.end()
  }
}

if (require.main === module) {
  seed()
}

module.exports = { seed }
