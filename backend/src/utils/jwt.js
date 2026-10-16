const jwt = require('jsonwebtoken')
const path = require('node:path')
const db = require('../config/db')
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') })
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local'), override: true })

// 安全加固：优先从环境变量读取 JWT_SECRET，杜绝硬编码弱口令伪造风险
const JWT_SECRET = process.env.JWT_SECRET
if (typeof JWT_SECRET !== 'string' || JWT_SECRET.trim().length < 32 || JWT_SECRET === 'sino_wind_gufeng_jwt_secret_2026') {
  throw new Error('JWT_SECRET 必须配置为至少32字符的独立随机密钥；请设置 backend/.env.local 后启动服务')
}

function verifyToken() {
  return async (ctx, next) => {
    const header = ctx.request.header.authorization
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : ''
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      if (!validSubject(decoded)) throw new Error('Invalid subject')
    } catch {
      // 保留既有客户端使用的 416，不改变登录签名协议。
      ctx.status = 416
      ctx.body = { code: 0, message: token ? 'token失效' : '请重新登录' }
      return
    }
    const current = await attachCurrentSession(ctx, decoded)
    if (current === null) return
    if (!current) {
      ctx.status = 416; ctx.body = { code: 0, message: 'token失效' }; return
    }
    // 业务异常不应被误报为 Token 失效。
    await next()
  }
}

function optionalToken() {
  return async (ctx, next) => {
    const header = ctx.request.header.authorization
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : ''
    let decoded
    if (token) {
      try {
        decoded = jwt.verify(token, JWT_SECRET)
        if (!validSubject(decoded)) decoded = null
      } catch {
        // 可选鉴权失败不阻断公开访问
      }
    }
    // Revoked credentials never recover a user identity, including on public endpoints.
    // A database outage must not silently turn an authenticated write into guest behavior.
    if (decoded && await attachCurrentSession(ctx, decoded) === null) return
    await next()
  }
}

function validSubject(decoded) {
  return decoded && Number.isSafeInteger(decoded.id) && decoded.id > 0 &&
    (decoded.authVersion === undefined || Number.isSafeInteger(decoded.authVersion) && decoded.authVersion >= 0)
}
async function attachCurrentSession(ctx, decoded) {
  try {
    const [rows] = await db.execute('SELECT auth_version FROM users WHERE id=? LIMIT 1', [decoded.id])
    const authVersion = decoded.authVersion ?? 0
    if (!rows[0] || Number(rows[0].auth_version) !== authVersion) return false
    ctx.userId = decoded.id
    ctx.authVersion = authVersion
    return true
  } catch {
    ctx.status = 503
    ctx.body = { code: 0, message: '账号验证暂不可用，请稍后重试' }
    return null
  }
}

module.exports = { verifyToken, optionalToken, JWT_SECRET }
