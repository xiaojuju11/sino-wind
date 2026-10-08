const db = require('../config/db.js')

async function findUserByPhone(phone) {
  const [rows] = await db.execute('SELECT * FROM users WHERE phone = ? LIMIT 1', [phone])
  return rows[0]
}

async function createUser({phone, passwordHash, nickname}) {
  const [res] = await db.execute('INSERT INTO users (phone, password_hash, create_time, nickname) VALUES (?, ?, NOW(), ?)', [phone, passwordHash, nickname])
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
  const allKeys = ['id', 'avatar', 'nickname', 'password_hash']
  const currentkeys = Object.keys(params)  // ['avatar']
  
  currentkeys.forEach((item) => {
    if (!allKeys.includes(item)) {
      throw new Error('参数错误')
    }
  })

  const _sql = currentkeys.map((item) => `${item} = ?`).join(', ')   // ['avatar = ?']

  // 更新数据库
  const [res] = await db.execute(`UPDATE users SET ${_sql} WHERE id = ?`, [...currentkeys.map((item) => params[item]), id])
  return res
}


module.exports = {
  findUserByPhone,
  createUser,
  findUserById,
  updateUserInfo
}