const jwt = require('jsonwebtoken')
require('dotenv').config({ path: ['.env.local', '.env'] })

// 安全加固：优先从环境变量读取 JWT_SECRET，杜绝硬编码弱口令伪造风险
const JWT_SECRET = process.env.JWT_SECRET || 'sino_wind_gufeng_jwt_secret_2026'

function verifyToken() {
  return async (ctx, next) => {
    const header = ctx.request.header.authorization
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : ''
    let decoded
    try {
      decoded = jwt.verify(token, JWT_SECRET)
      if (!Number.isSafeInteger(decoded.id) || decoded.id <= 0) throw new Error('Invalid subject')
    } catch {
      // 保留既有客户端使用的 416，不改变登录签名协议。
      ctx.status = 416
      ctx.body = { code: 0, message: token ? 'token失效' : '请重新登录' }
      return
    }
    ctx.userId = decoded.id
    // 业务异常不应被误报为 Token 失效。
    await next()
  }
}
module.exports = { verifyToken, JWT_SECRET }
