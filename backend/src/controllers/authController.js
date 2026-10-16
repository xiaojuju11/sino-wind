const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../utils/jwt.js')
const { findUserByPhone, createUser, findUserById, updateUserInfo, updateUserPassword } = require('../models/userModel.js')
const { generateCaptcha, verifyCaptcha } = require('../utils/captcha.js')
const db = require('../config/db')
const { generateRecoveryCode, matchesRecoveryCode, validPassword, validAccount, normalizeAccount, checkRecoveryRateLimit, INVALID_RECOVERY_MESSAGE } = require('../utils/accountRecovery')


async function login(ctx) {
  // 解析请求体中的账号密码
  const { phone, password } = ctx.request.body || {}
  if (typeof phone !== 'string' || !phone || typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
    ctx.status = 400; // 设置 http 的状态码
    ctx.body = { message: '账号和密码不能为空' }
    return
  }
  // 去数据库中查询是否存在相同的账号密码
  const user = await findUserByPhone(phone)
  // console.log(user);

  if (!user) {
    ctx.status = 400
    ctx.body = { message: '账号不存在' }
    return
  }
  // 校验密码
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    ctx.status = 400
    ctx.body = { message: '密码错误' }
    return
  }

  // 生成一个 token（使用安全的 JWT_SECRET）
  const token = jwt.sign({ id: user.id, phone: user.phone, authVersion: Number(user.auth_version) }, JWT_SECRET, { expiresIn: '7d' })

  ctx.body = {
    message: '登录成功',
    token,
    user: {
      id: user.id,
      phone: user.phone
    },
    code: 1
  }
}

// 生成图形验证码
function getCaptcha(ctx) {
  try {
    const captcha = generateCaptcha()
    ctx.body = {
      captchaId: captcha.id,
      captchaSvg: captcha.svg,
      code: 1
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      message: '生成验证码失败',
      code: 0,
      error: error.message
    }
  }

}

// 注册
async function register(ctx) {
  const { nickname, phone: rawPhone, captchaId, captchaCode, password } = ctx.request.body || {}
  const phone = normalizeAccount(rawPhone)

  if (typeof nickname !== 'string' || !nickname.trim() || nickname.length > 50 || !validAccount(phone) || !validPassword(password)) {
    ctx.status = 400
    ctx.body = {
      message: '请填写有效手机号或支持的邮箱和昵称，密码须至少6位且不超过72字节',
      code: 0
    }
    return
  }

  // 验证图形验证码
  if (typeof captchaId !== 'string' || !captchaId || typeof captchaCode !== 'string' || !captchaCode) {
    ctx.status = 400
    ctx.body = {
      message: '请输入验证码',
      code: 0
    }
    return
  }
  const captchaResult = verifyCaptcha(captchaId, captchaCode)
  if (!captchaResult.valid) {
    ctx.status = 400
    ctx.body = {
      message: captchaResult.message,
      code: 0
    }
    return
  }

  // 判断数据库中账号是否已存在
  const existed = await findUserByPhone(phone)
  if (existed) {
    ctx.status = 400
    ctx.body = {
      message: '账号已存在',
      code: 0
    }
    return
  }

  // 加密密码
  const passwordHash = await bcrypt.hash(password, 10)

  // 写入数据库
  try {
    const recovery = generateRecoveryCode()
    const user = await createUser({ phone, passwordHash, nickname: nickname.trim(), recoveryHash: recovery.hash })
    ctx.set('Cache-Control', 'no-store')
    ctx.body = {
      message: '注册成功',
      user: user,
      code: 1,
      recoveryCode: recovery.recoveryCode
    }
  } catch (error) {
    ctx.status = error.code === 'ER_DUP_ENTRY' ? 400 : 500
    ctx.body = {
      message: error.code === 'ER_DUP_ENTRY' ? '账号已存在' : '服务器异常',
      code: 0
    }
  }

}

// 获取用户信息
async function getUserInfo(ctx) {
  const id = ctx.userId
  try {
    const res = await findUserById(id)
    if (!res) {
      ctx.status = 401
      ctx.body = { code: 0, message: '请重新入席' }
      return
    }
    
    const data = {
      code: 1,
      id: res.id,
      create_time: res.create_time,
      phone: res.phone,
      nickname: res.nickname,
      avatar: res.avatar,
      appraise_count: res.appraise_count,
      debate_count: res.debate_count,
      poem_count: res.poem_count,
      merit_points: res.merit_points ?? 0,
      scholar_rank: require('../utils/feihuaEngine').scholarRank(res.merit_points),
      rank_level: res.rank_level
    }
    ctx.body = data
  } catch (error) {
    console.error('Get user info error:', error)
    ctx.status = 400
    ctx.body = {
      code: 0,
      mesaage: '查找用户数据失败'
    }
  }
}

// 更新用户信息
async function updateUser(ctx) {
  const id = ctx.userId
  const params = ctx.request.body
  // koa-router is case-insensitive and accepts a trailing slash by default.
  const field = /\/updateavatar\/?$/i.test(ctx.path) ? 'avatar' : 'nickname'
  if (!params || typeof params !== 'object' || Array.isArray(params) || Object.keys(params).length !== 1 || typeof params[field] !== 'string' || !params[field].trim() || params[field].length > (field === 'nickname' ? 50 : 2048)) {
    ctx.status = 400; ctx.body = { code: 0, message: '仅可修改有效的头像或昵称' }; return
  }

  try {
    const res = await updateUserInfo({ [field]: params[field].trim() }, id)
    
    if (res.affectedRows) {
      ctx.body = {
        code: 1,
        message: '更新成功'
      }
    } else {
      ctx.status = 400
      ctx.body = {
        code: 0,
        message: '更新失败'
      }
    }
  } catch (error) {
    console.error('Update user error:', error)
    ctx.status = 500
    ctx.body = {
      code: 0,
      message: error.message
    }
  }

}

// 更新密码
async function updatePassword(ctx) {
  const id = ctx.userId
  const { oldPassword, newPassword } = ctx.request.body || {}
  if (typeof oldPassword !== 'string' || !oldPassword || Buffer.byteLength(oldPassword, 'utf8') > 72 || !validPassword(newPassword)) {
    ctx.status = 400; ctx.body = { code: 0, message: '请提供旧密码，新密码须至少6位且不超过72字节' }; return
  }
  try {
    const user = await findUserById(id)
    if (!user) { ctx.status = 401; ctx.body = { code: 0, message: '请重新登录' }; return }
    if (ctx.authVersion !== undefined && Number(user.auth_version) !== ctx.authVersion) {
      ctx.status = 416; ctx.body = { code: 0, message: '登录已失效，请重新入席' }; return
    }
    const ok = await bcrypt.compare(oldPassword, user.password_hash)
    if (!ok) {
      ctx.status = 400
      ctx.body = { message: '旧密码错误', code: 0 }
      return
    }
    const password_hash = await bcrypt.hash(newPassword, 10)
    const res = await updateUserPassword(password_hash, id, user.password_hash, Number(user.auth_version))
    if (res.affectedRows) {
      ctx.body = {
        code: 1,
        message: '密码更新成功'
      }
    } else {
      ctx.status = 400
      ctx.body = {
        code: 0,
        message: '密码更新失败'
      }
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      code: 0,
      message: error.message
    }
  }
}

// A signed-in owner must re-enter the password before replacing the recovery secret.
async function issueRecoveryCode(ctx) {
  ctx.set('Cache-Control', 'no-store')
  const { password } = ctx.request.body || {}
  let connection
  try {
    if (!await checkRecoveryRateLimit(ctx, 'issue', String(ctx.userId))) return
    if (typeof password !== 'string' || !password || Buffer.byteLength(password, 'utf8') > 72) {
      ctx.status = 400; ctx.body = { code: 0, message: '请输入当前密码' }; return
    }
    connection = await db.getConnection()
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT password_hash, auth_version FROM users WHERE id=? FOR UPDATE', [ctx.userId])
    const user = rows[0]
    if (!user || Number(user.auth_version) !== ctx.authVersion) {
      await connection.rollback()
      ctx.status = 416; ctx.body = { code: 0, message: '登录已失效，请重新入席' }; return
    }
    if (!await bcrypt.compare(password, user.password_hash)) {
      await connection.rollback()
      ctx.status = 400; ctx.body = { code: 0, message: '当前密码不正确' }; return
    }
    const recovery = generateRecoveryCode()
    await connection.execute('UPDATE users SET recovery_code_hash=? WHERE id=?', [recovery.hash, ctx.userId])
    await connection.commit()
    ctx.body = { code: 1, message: '恢复码已更新，请立即妥善保存', data: { recoveryCode: recovery.recoveryCode } }
  } catch {
    if (connection) await connection.rollback().catch(() => {})
    ctx.status = 503; ctx.body = { code: 0, message: '账号恢复服务暂不可用，请稍后重试' }
  } finally { if (connection) connection.release() }
}

async function resetWithRecoveryCode(ctx) {
  ctx.set('Cache-Control', 'no-store')
  const { phone: rawPhone, recoveryCode, newPassword } = ctx.request.body || {}
  const phone = normalizeAccount(rawPhone)
  let connection
  try {
    // Malformed inputs still count against the caller's limit; no lookup-based response differences.
    if (!await checkRecoveryRateLimit(ctx, 'reset', phone || 'invalid')) return
    if (!validPassword(newPassword)) {
      ctx.status = 400; ctx.body = { code: 0, message: '新密码须至少6位且不超过72字节' }; return
    }
    if (!validAccount(phone)) {
      ctx.status = 400; ctx.body = { code: 0, message: INVALID_RECOVERY_MESSAGE }; return
    }
    connection = await db.getConnection()
    await connection.beginTransaction()
    const [rows] = await connection.execute('SELECT id, recovery_code_hash FROM users WHERE phone=? LIMIT 1 FOR UPDATE', [phone])
    const user = rows[0]
    if (!matchesRecoveryCode(recoveryCode, user?.recovery_code_hash)) {
      await connection.rollback()
      ctx.status = 400; ctx.body = { code: 0, message: INVALID_RECOVERY_MESSAGE }; return
    }
    const passwordHash = await bcrypt.hash(newPassword, 10)
    const recovery = generateRecoveryCode()
    // The row lock serializes use of the old code. Its replacement and session revocation commit together.
    await connection.execute('UPDATE users SET password_hash=?, recovery_code_hash=?, auth_version=auth_version+1 WHERE id=?', [passwordHash, recovery.hash, user.id])
    await connection.commit()
    ctx.body = { code: 1, message: '密码已重置，请保存新恢复码后重新入席', data: { recoveryCode: recovery.recoveryCode } }
  } catch {
    if (connection) await connection.rollback().catch(() => {})
    ctx.status = 503; ctx.body = { code: 0, message: '账号恢复服务暂不可用，请稍后重试' }
  } finally { if (connection) connection.release() }
}


module.exports = {
  login,
  getCaptcha,
  register,
  getUserInfo,
  updateUser,
  updatePassword,
  issueRecoveryCode,
  resetWithRecoveryCode
}
