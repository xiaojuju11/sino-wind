const db = require('../config/db.js')

async function findUserByPhone(phone) {
  const [rows] = await db.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone])
  return rows[0]
}

async function createUser({phone, passwordHash, nickname, recoveryHash}) {
  // One statement persists both password and recovery hash; a failed insert leaves no half-created account.
  const [res] = await db.execute('INSERT INTO users (phone, password_hash, create_time, nickname, recovery_code_hash) VALUES (?, ?, NOW(), ?, ?)', [phone, passwordHash, nickname, recoveryHash || null])
  // console.log(res);
  if (res.affectedRows) {
    return {
      id: res.insertId,
      phone
    }
  }
}

async function findUserById(id) {
  const [rows] = await db.execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return rows[0]
}

async function updateUserInfo (params, id) {
  const allKeys = ['avatar', 'nickname']
  if (!params || typeof params !== 'object' || Array.isArray(params) || !Object.keys(params).length) throw new Error('资料参数无效')
  const currentkeys = Object.keys(params)  // ['avatar']
  
  currentkeys.forEach((item) => {
    if (!allKeys.includes(item) || typeof params[item] !== 'string' || !params[item].trim() || params[item].length > (item === 'nickname' ? 50 : 2048)) {
      throw new Error('参数错误')
    }
  })

  const _sql = currentkeys.map((item) => `${item} = ?`).join(', ')   // ['avatar = ?']

  // 更新数据库
  const [res] = await db.execute(`UPDATE users SET ${_sql} WHERE id = ?`, [...currentkeys.map((item) => params[item]), id])
  return res
}

// Password changes are reachable only through the controller that verifies the old password.
async function updateUserPassword(passwordHash, id, previousHash, authVersion) {
  return (await db.execute('UPDATE users SET password_hash = ? WHERE id = ? AND password_hash = ? AND auth_version = ?', [passwordHash, id, previousHash, authVersion]))[0]
}

module.exports = {
  findUserByPhone,
  createUser,
  findUserById,
  updateUserInfo,
  updateUserPassword
}
