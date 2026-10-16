// Real local HTTP + MySQL regression. Only uniquely named accounts created here are reset/deleted.
const assert = require('node:assert/strict')
const { randomUUID, randomInt, randomBytes } = require('node:crypto')
const Koa = require('koa'), Router = require('koa-router'), bodyParser = require('koa-bodyparser')
const jwt = require('jsonwebtoken'), bcrypt = require('bcrypt'), svgCaptcha = require('svg-captcha')
const db = require('../src/config/db')
const { migrate } = require('./init-account-recovery')
// Fixtures use an ephemeral signing key, regardless of real deployment secrets.
// This override exists only while the JWT module loads in this isolated test process.
const dotenv = require('dotenv'), originalConfig = dotenv.config, fixtureSecret = randomBytes(48).toString('hex')
dotenv.config = (...args) => { const result = originalConfig(...args); process.env.JWT_SECRET = fixtureSecret; return result }
const { JWT_SECRET, verifyToken, optionalToken } = require('../src/utils/jwt')
dotenv.config = originalConfig
const { recoveryLimitKeys, normalizeRecoveryCode, matchesRecoveryCode, normalizeAccount, validAccount, INVALID_RECOVERY_MESSAGE } = require('../src/utils/accountRecovery')
const marker = `QA恢复-${randomUUID().slice(0, 16)}`
const phones = [], limitKeys = new Set(), fixtureIps = new Set()
let server, captchaAnswer
const originalCaptchaCreate = svgCaptcha.create
const originalExecute = db.execute
let unavailable = false

async function unusedPhone() {
  for (;;) {
    const phone = '188' + String(randomInt(100000000)).padStart(8, '0')
    if (!(await db.execute('SELECT id FROM users WHERE phone=?', [phone]))[0].length && !phones.includes(phone)) {
      phones.push(phone); return phone
    }
  }
}
async function unusedEmail(domain = 'foxmail.com', length) {
  for (;;) {
    const prefix = 'qa.' + randomUUID().replaceAll('-', '')
    const account = (length ? prefix.padEnd(length - domain.length - 1, 'x') : prefix) + '@' + domain
    if (!(await db.execute('SELECT id FROM users WHERE phone=?', [account]))[0].length && !phones.includes(account)) {
      phones.push(account); return account
    }
  }
}
async function run() {
  await migrate(); await migrate()
  svgCaptcha.create = (...args) => { const value = originalCaptchaCreate(...args); captchaAnswer = value.text; return value }
  db.execute = (...args) => unavailable ? Promise.reject(new Error('fixture database failure')) : originalExecute.apply(db, args)
  const app = new Koa(), probe = new Router()
  app.use(async (ctx, next) => {
    // A test-only synthetic network identity isolates rate-limit fixtures from real local users.
    const ip = marker + ':' + (ctx.get('X-Test-IP') || 'default')
    fixtureIps.add(ip); Object.defineProperty(ctx, 'ip', { value: ip }); await next()
  })
  probe.get('/required', verifyToken(), ctx => { ctx.body = { userId: ctx.userId } })
  probe.get('/optional', optionalToken(), ctx => { ctx.body = { userId: ctx.userId || null } })
  const auth = require('../src/routes/authRoutes')
  app.use(bodyParser()).use(auth.routes()).use(auth.allowedMethods()).use(probe.routes())
  server = app.listen(0, '127.0.0.1'); await new Promise(resolve => server.once('listening', resolve))
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (path, body, token, ip) => {
    const response = await fetch(base + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(ip ? { 'X-Test-IP': ip } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) })
    return { status: response.status, cache: response.headers.get('Cache-Control'), retry: response.headers.get('Retry-After'), body: await response.json() }
  }
  const captcha = async () => { const response = await call('/api/auth/captcha'); return { captchaId: response.body.captchaId, captchaCode: captchaAnswer } }
  const register = async (phone, password = 'original-pass') => call('/api/auth/register', { nickname: marker, phone, password, ...await captcha() })
  const login = async (phone, password) => (await call('/api/auth/login', { phone, password })).body.token
  const reset = (phone, recoveryCode, newPassword = 'replacement-pass', ip) => call('/api/auth/recovery/reset', { phone, recoveryCode, newPassword }, null, ip)
  const phone = await unusedPhone(), missingPhone = await unusedPhone()
  const created = await register(phone)
  assert.equal(created.body.code, 1); assert.equal(created.cache, 'no-store')
  assert.match(created.body.recoveryCode, /^(?:[A-F0-9]{6}-){7}[A-F0-9]{6}$/)
  const [[user]] = await db.execute('SELECT * FROM users WHERE phone=?', [phone])
  assert.ok(matchesRecoveryCode(created.body.recoveryCode, user.recovery_code_hash))
  assert.notEqual(user.recovery_code_hash, normalizeRecoveryCode(created.body.recoveryCode))
  assert.equal(user.auth_version, 0)
  const legacyToken = jwt.sign({ id: user.id }, JWT_SECRET)
  assert.equal((await call('/required', null, legacyToken)).status, 200)
  assert.equal((await call('/optional', null, legacyToken)).body.userId, user.id)
  const token = await login(phone, 'original-pass')
  assert.equal((await call('/api/auth/recovery-code', { password: 'original-pass' })).status, 416)
  assert.equal((await call('/api/auth/recovery-code', { password: 'wrong' }, token)).status, 400)
  const rotated = await call('/api/auth/recovery-code', { password: 'original-pass' }, token)
  assert.equal(rotated.body.code, 1); assert.notEqual(rotated.body.data.recoveryCode, created.body.recoveryCode)
  const stale = await reset(phone, created.body.recoveryCode)
  const missing = await reset(missingPhone, rotated.body.data.recoveryCode)
  assert.equal(stale.status, 400); assert.deepEqual(stale.body, missing.body)
  assert.equal(stale.body.message, INVALID_RECOVERY_MESSAGE)
  assert.equal((await reset(phone, rotated.body.data.recoveryCode, '短')).status, 400)
  const useCode = rotated.body.data.recoveryCode.toLowerCase().replaceAll('-', ' ')
  const competing = await Promise.all([reset(phone, useCode), reset(phone, useCode)])
  assert.deepEqual(competing.map(row => row.status).sort(), [200, 400])
  const nextCode = competing.find(row => row.status === 200).body.data.recoveryCode
  assert.equal((await call('/required', null, token)).status, 416)
  assert.equal((await call('/required', null, legacyToken)).status, 416)
  assert.equal((await call('/optional', null, legacyToken)).body.userId, null)
  assert.equal((await call('/api/auth/login', { phone, password: 'original-pass' })).status, 400)
  const newToken = await login(phone, 'replacement-pass')
  assert.ok(newToken); assert.equal((await call('/required', null, newToken)).status, 200)
  const [[updated]] = await db.execute('SELECT * FROM users WHERE id=?', [user.id])
  assert.equal(updated.auth_version, 1); assert.ok(matchesRecoveryCode(nextCode, updated.recovery_code_hash))
  assert.equal(matchesRecoveryCode(useCode, updated.recovery_code_hash), false)
  unavailable = true
  for (const path of ['/required', '/optional']) assert.equal((await call(path, null, newToken)).status, 503)
  unavailable = false
  // Existing accounts have no recovery secret until their authenticated owner creates one.
  const oldPhone = await unusedPhone()
  await db.execute('INSERT INTO users(phone,nickname,password_hash) VALUES (?,?,?)', [oldPhone, marker, await bcrypt.hash('legacy-pass', 10)])
  const oldToken = await login(oldPhone, 'legacy-pass')
  assert.equal((await reset(oldPhone, 'A'.repeat(48))).body.message, INVALID_RECOVERY_MESSAGE)
  assert.equal((await call('/api/auth/recovery-code', { password: 'legacy-pass' }, oldToken)).body.code, 1)
  // No account is left behind by failed registration.
  const failedPhone = await unusedPhone()
  for (const invalid of ['      ', '汉'.repeat(25)]) assert.equal((await register(failedPhone, invalid)).status, 400)
  assert.equal((await call('/api/auth/register', { phone: failedPhone, nickname: marker, password: 'original-pass', captchaId: 'missing', captchaCode: 'bad' })).status, 400)
  assert.equal((await db.execute('SELECT id FROM users WHERE phone=?', [failedPhone]))[0].length, 0)
  const duplicate = await register(phone)
  assert.equal(duplicate.status, 400)
  assert.equal((await db.execute('SELECT id FROM users WHERE phone=?', [phone]))[0].length, 1)
  // Emails remain valid account identifiers, including values wider than the original VARCHAR(20).
  for (const domain of ['qq.com', '163.com', '126.com', 'sina.com', 'sina.cn', 'gmail.com', 'foxmail.com']) assert.ok(validAccount('Sage.Name@' + domain))
  assert.equal(validAccount('sage@example.com'), false)
  const email = await unusedEmail(), registeredEmail = await register(' ' + email.toUpperCase() + ' ')
  assert.equal(registeredEmail.body.code, 1)
  const [[emailUser]] = await db.execute('SELECT id,phone FROM users WHERE phone=?', [email])
  assert.equal(emailUser.phone, email)
  const emailToken = await login(email.toUpperCase(), 'original-pass')
  assert.ok(emailToken)
  assert.equal((await reset(email.toUpperCase(), registeredEmail.body.recoveryCode, 'email-new-pass')).body.code, 1)
  assert.equal((await call('/required', null, emailToken)).status, 416)
  assert.ok(await login(email, 'email-new-pass'))
  assert.equal((await register(email.toUpperCase())).status, 400)
  assert.equal((await db.execute('SELECT id FROM users WHERE phone=?', [email]))[0].length, 1)
  // The successful reset above is attempt one; spelling variants and changing IP share the other four.
  const variants = [email.toUpperCase(), ' ' + email + ' ', email.replace('qa.', 'Qa.'), email.replace('@foxmail.com', '@FOXMAIL.COM')]
  for (let i = 0; i < variants.length; i++) assert.equal((await reset(variants[i], 'A'.repeat(48), 'email-new-pass', 'email-case-' + i)).status, 400)
  assert.equal((await reset(email, 'A'.repeat(48), 'email-new-pass', 'email-case-final')).status, 429)
  const legacyEmail = await unusedEmail('sina.cn')
  await db.execute('INSERT INTO users(phone,nickname,password_hash) VALUES (?,?,?)', [legacyEmail.toUpperCase(), marker, await bcrypt.hash('legacy-mail-pass', 10)])
  const legacyEmailToken = await login(legacyEmail, 'legacy-mail-pass')
  const legacyEmailCode = await call('/api/auth/recovery-code', { password: 'legacy-mail-pass' }, legacyEmailToken)
  assert.equal(legacyEmailCode.body.code, 1)
  assert.equal((await reset(legacyEmail, legacyEmailCode.body.data.recoveryCode, 'legacy-mail-new')).body.code, 1)
  const longEmail = await unusedEmail('qq.com', 254)
  assert.equal(longEmail.length, 254)
  assert.equal((await register(longEmail)).body.code, 1)
  assert.equal((await register('x' + longEmail)).status, 400)
  assert.equal((await db.execute('SELECT id FROM users WHERE phone=?', ['x' + longEmail]))[0].length, 0)
  // A single account cannot evade its limit by changing source IP.
  const limitedPhone = await unusedPhone()
  for (let i = 0; i < 5; i++) assert.equal((await reset(limitedPhone, 'A'.repeat(48), 'valid-pass', 'account-' + i)).status, 400)
  const accountLimit = await reset(limitedPhone, 'A'.repeat(48), 'valid-pass', 'account-final')
  assert.equal(accountLimit.status, 429); assert.equal(accountLimit.retry, '900')
  // A single source cannot evade its limit by changing account.
  for (let i = 0; i < 30; i++) assert.equal((await reset(await unusedPhone(), 'B'.repeat(48), 'valid-pass', 'ip-limit')).status, 400)
  assert.equal((await reset(await unusedPhone(), 'B'.repeat(48), 'valid-pass', 'ip-limit')).status, 429)
  console.log('PASS 账号恢复：手机/邮箱及254位兼容、邮箱大小写限流、注册原子保存、一次性恢复码、并发防复用、旧Token撤销、可选鉴权、独立双限流、旧账号兼容、失败保留及数据库故障关闭')
}

run().catch(error => { console.error(error); process.exitCode = 1 }).finally(async () => {
  unavailable = false; db.execute = originalExecute; svgCaptcha.create = originalCaptchaCreate
  if (server) await new Promise(resolve => server.close(resolve))
  try {
    const [users] = await db.execute('SELECT id,phone FROM users WHERE nickname=?', [marker])
    for (const user of users) if (phones.some(account => normalizeAccount(account) === normalizeAccount(user.phone))) {
      for (const ip of fixtureIps) recoveryLimitKeys('issue', ip, String(user.id)).forEach(key => limitKeys.add(key))
      await db.execute('DELETE FROM users WHERE id=? AND nickname=?', [user.id, marker])
    }
    for (const phone of phones) for (const ip of fixtureIps) recoveryLimitKeys('reset', ip, phone).forEach(key => limitKeys.add(key))
    for (const key of limitKeys) await db.execute('DELETE FROM auth_recovery_attempts WHERE key_hash=?', [key])
  } finally { await db.end() }
  // Existing captcha cleanup timers last five minutes; all fixture sockets/data are closed above.
  process.exit(process.exitCode || 0)
})
