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
    // 1. 自动对齐补齐 users 表缺失的历史演进字段
    console.log('[Seed] 正在检查 users 表字段结构并自动对齐...')
    const [cols] = await connection.execute(
      'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
      ['users']
    )
    const existingCols = new Set(cols.map(c => c.COLUMN_NAME))

    const requiredColumns = [
      { name: 'avatar', def: 'MEDIUMTEXT NULL' },
      { name: 'appraise_count', def: "INT DEFAULT '0' COMMENT '鉴宝藏器数'" },
      { name: 'debate_count', def: "INT DEFAULT '0' COMMENT '论道问策数'" },
      { name: 'poem_count', def: "INT DEFAULT '0' COMMENT '诗签摘录数'" },
      { name: 'rank_level', def: "VARCHAR(20) DEFAULT '玖阶' COMMENT '文风品位品阶'" },
      { name: 'merit_points', def: "INT UNSIGNED NOT NULL DEFAULT '0'" },
      { name: 'yayan_count', def: "INT UNSIGNED NOT NULL DEFAULT '0'" },
      { name: 'recovery_code_hash', def: 'CHAR(64) DEFAULT NULL' },
      { name: 'auth_version', def: "INT UNSIGNED NOT NULL DEFAULT '0'" }
    ]

    for (const col of requiredColumns) {
      if (!existingCols.has(col.name)) {
        try {
          await connection.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.def}`)
          console.log(`[Seed] 成功向 users 表补充缺失字段: ${col.name}`)
        } catch (alterErr) {
          if (alterErr.code !== 'ER_DUP_FIELDNAME') {
            console.warn(`[Seed] 补充字段 ${col.name} 警告:`, alterErr.message)
          }
        }
      }
    }

    // 2. 自动检查并创建先贤生态与游戏等必要表
    await connection.query(`
      CREATE TABLE IF NOT EXISTS scholar_artifacts (
        id CHAR(36) PRIMARY KEY,
        user_id INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        dynasty VARCHAR(80) NOT NULL,
        description TEXT NOT NULL,
        score FLOAT DEFAULT NULL,
        degraded TINYINT NOT NULL DEFAULT '0',
        created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX(user_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS scholar_conversations (
        user_id INT NOT NULL,
        sage_id VARCHAR(80) NOT NULL,
        rounds INT UNSIGNED NOT NULL DEFAULT '0',
        leave_rounds INT UNSIGNED NOT NULL DEFAULT '0',
        last_message TEXT NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        reply_id CHAR(36) DEFAULT NULL,
        reply_text TEXT,
        reply_at DATETIME(3) DEFAULT NULL,
        reply_unread TINYINT NOT NULL DEFAULT '0',
        PRIMARY KEY (user_id, sage_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS scholar_turns (
        user_id INT NOT NULL,
        request_id CHAR(36) NOT NULL,
        sage_id VARCHAR(80) NOT NULL,
        question TEXT NOT NULL,
        answer TEXT NOT NULL,
        degraded TINYINT NOT NULL DEFAULT '0',
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (user_id, request_id),
        INDEX(user_id, sage_id, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS auth_recovery_attempts (
        key_hash CHAR(64) PRIMARY KEY,
        window_start DATETIME(3) NOT NULL,
        attempts INT UNSIGNED NOT NULL DEFAULT '1',
        INDEX(window_start)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS user_poems (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        poem_id VARCHAR(64) DEFAULT NULL,
        title VARCHAR(100) NOT NULL,
        author VARCHAR(50) NOT NULL,
        dynasty VARCHAR(30) DEFAULT '唐代',
        content TEXT NOT NULL,
        appreciation TEXT,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    await connection.query(`
      CREATE TABLE IF NOT EXISTS feihua_games (
        id CHAR(36) NOT NULL,
        user_id INT DEFAULT NULL,
        guest_hash CHAR(64) DEFAULT NULL,
        state JSON NOT NULL,
        awarded_points INT NOT NULL DEFAULT '0',
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX(user_id),
        INDEX(expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    `)

    // 3. 写入/重置测试与评审账号
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
        console.log(`[Seed] 用户 [${u.phone}] (${u.nickname}) 密码已重置为 123456 (id=${rows[0].id})`)
      } else {
        const [res] = await connection.execute(
          'INSERT INTO users (phone, password_hash, nickname, rank_level, merit_points, auth_version) VALUES (?, ?, ?, ?, ?, 0)',
          [u.phone, u.passwordHash, u.nickname, u.rank_level, u.merit_points]
        )
        console.log(`[Seed] 新增测试用户 [${u.phone}] (${u.nickname})，密码: 123456 (id=${res.insertId})`)
      }
    }
    console.log('[Seed] 演示账号与数据库字段已全面初始化完毕！')
    console.log('[Seed] 可通过 15779889503 / 123456 或 13800000000 / 123456 直接登录。')
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
