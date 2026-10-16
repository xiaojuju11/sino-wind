const { randomBytes, createHash, timingSafeEqual } = require('node:crypto')
const db = require('../config/db')

const INVALID_RECOVERY_MESSAGE = '账号或恢复码无效，请检查后重试'
const RECOVERY_WINDOW_MS = 15 * 60 * 1000
let nextLimitCleanup = 0

function generateRecoveryCode() {
  const raw = randomBytes(24).toString('hex').toUpperCase()
  return { recoveryCode: raw.match(/.{6}/g).join('-'), hash: digest(raw) }
}
function digest(text) { return createHash('sha256').update(text).digest('hex') }
function normalizeRecoveryCode(value) {
  if (typeof value !== 'string' || value.length > 100) return null
  const raw = value.replace(/[\s-]/g, '').toUpperCase()
  return /^[0-9A-F]{48}$/.test(raw) ? raw : null
}
function matchesRecoveryCode(code, hash) {
  const raw = normalizeRecoveryCode(code)
  const expected = typeof hash === 'string' && /^[0-9a-f]{64}$/.test(hash) ? hash : '0'.repeat(64)
  const match = timingSafeEqual(Buffer.from(digest(raw || 'invalid'), 'hex'), Buffer.from(expected, 'hex'))
  return Boolean(raw && hash && match)
}
function validPassword(value) {
  return typeof value === 'string' && value.length >= 6 && /\S/.test(value) && Buffer.byteLength(value, 'utf8') <= 72
}
function normalizeAccount(value) { return typeof value === 'string' ? value.trim().toLowerCase() : '' }
function validAccount(value) {
  const account = normalizeAccount(value)
  return account.length > 0 && account.length <= 254 && (/^1[3-9]\d{9}$/.test(account) ||
    /^[a-z0-9._%+-]+@(?:qq\.com|163\.com|126\.com|sina\.(?:com|cn)|gmail\.com|foxmail\.com)$/.test(account))
}
function recoveryLimitKeys(operation, ip, identity) {
  // users.phone uses a case-insensitive collation; case/space variants must share one limit.
  return [digest(`${operation}:ip:${ip}`), digest(`${operation}:account:${normalizeAccount(identity).slice(0, 254)}`)]
}

// Independent, shared database limits survive restarts and cover concurrent workers.
// Never log/store raw account, IP or recovery-code values in this table.
async function checkRecoveryRateLimit(ctx, operation, identity) {
  if (Date.now() >= nextLimitCleanup) {
    nextLimitCleanup = Date.now() + 60000
    await db.execute('DELETE FROM auth_recovery_attempts WHERE window_start < NOW(3) - INTERVAL 1 DAY LIMIT 1000')
  }
  const limits = [30, 5]
  const keys = recoveryLimitKeys(operation, ctx.ip, identity)
  let limited = false
  for (let i = 0; i < keys.length; i += 1) {
    await db.execute(`INSERT INTO auth_recovery_attempts (key_hash, window_start, attempts)
      VALUES (?, NOW(3), 1) ON DUPLICATE KEY UPDATE
      attempts = IF(window_start <= NOW(3) - INTERVAL 15 MINUTE, 1, attempts + 1),
      window_start = IF(window_start <= NOW(3) - INTERVAL 15 MINUTE, NOW(3), window_start)`, [keys[i]])
    const [rows] = await db.execute('SELECT attempts FROM auth_recovery_attempts WHERE key_hash=?', [keys[i]])
    if (Number(rows[0].attempts) > limits[i]) limited = true
  }
  if (limited) {
    ctx.status = 429
    ctx.set('Retry-After', String(RECOVERY_WINDOW_MS / 1000))
    ctx.body = { code: 0, message: '尝试次数较多，请15分钟后重试' }
    return false
  }
  return true
}

module.exports = { generateRecoveryCode, normalizeRecoveryCode, matchesRecoveryCode, validPassword, validAccount, normalizeAccount,
  checkRecoveryRateLimit, recoveryLimitKeys, INVALID_RECOVERY_MESSAGE }
