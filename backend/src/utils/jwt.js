const jwt = require('jsonwebtoken')
const path = require('node:path')
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

function optionalToken() {
  return async (ctx, next) => {
    const header = ctx.request.header.authorization
    const token = typeof header === 'string' ? header.replace(/^Bearer\s+/i, '').trim() : ''
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET)
        if (Number.isSafeInteger(decoded.id) && decoded.id > 0) {
          ctx.userId = decoded.id
        }
      } catch {
        // 可选鉴权失败不阻断公开访问
      }
    }
    await next()
  }
}

module.exports = { verifyToken, optionalToken, JWT_SECRET }
