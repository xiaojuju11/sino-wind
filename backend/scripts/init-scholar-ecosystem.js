const db = require('../src/config/db')
async function migrate() {
  await db.execute(`CREATE TABLE IF NOT EXISTS scholar_artifacts (
    id CHAR(36) PRIMARY KEY, user_id INT NOT NULL, name VARCHAR(100) NOT NULL,
    dynasty VARCHAR(80) NOT NULL, description TEXT NOT NULL, score FLOAT NULL,
    degraded TINYINT NOT NULL, created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX(user_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await db.execute(`CREATE TABLE IF NOT EXISTS scholar_conversations (
    user_id INT NOT NULL, sage_id VARCHAR(80) NOT NULL,
    rounds INT UNSIGNED NOT NULL DEFAULT 0, leave_rounds INT UNSIGNED NOT NULL DEFAULT 0,
    last_message TEXT NOT NULL, updated_at DATETIME(3) NOT NULL,
    reply_id CHAR(36) NULL, reply_text TEXT NULL, reply_at DATETIME(3) NULL,
    reply_unread TINYINT NOT NULL DEFAULT 0, PRIMARY KEY(user_id,sage_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  await db.execute(`CREATE TABLE IF NOT EXISTS scholar_turns (
    user_id INT NOT NULL, request_id CHAR(36) NOT NULL, sage_id VARCHAR(80) NOT NULL,
    question TEXT NOT NULL, answer TEXT NOT NULL, degraded TINYINT NOT NULL DEFAULT 0,
    created_at DATETIME(3) NOT NULL, PRIMARY KEY(user_id,request_id),
    INDEX(user_id,sage_id,created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`)
  console.log('知音生态表就绪，既有用户和对局保留')
}
if (require.main === module) migrate().catch(e => { console.error(e.message); process.exitCode = 1 }).finally(() => db.end())
module.exports = { migrate }
