// 🔐 会话持久化：登录态（后端签发的 7 天 JWT）与「上次入席账号」的本机记忆。
//
// 刻意不做「密码缓存」：口令一旦落到 localStorage，任何同源脚本、XSS、共用设备
// 都能直接读走；免密进入靠的是 token —— 它会被后端校验，也可被服务端吊销。
// 这里只做两件事：
//   1. 读 token 的 exp 判断会话是否还有效（不验签，验签在服务端）；
//   2. 记住上次登录的账号，只在被迫重新登录时省去重输账号。

export const TOKEN_KEY = 'token'
export const ACCOUNT_KEY = 'gufeng_last_account'

// 提前 30 秒判定过期，避免「刚好卡在过期瞬间」进首页再被 416 踢回登录页
const CLOCK_SKEW_MS = 30 * 1000

export function readToken(storage = globalThis.localStorage) {
  try { return storage?.getItem(TOKEN_KEY) || '' } catch { return '' }
}

export function clearSessionToken(storage = globalThis.localStorage) {
  try { storage?.removeItem(TOKEN_KEY) } catch { /* 存储不可用时按未登录处理 */ }
}

/** 只解 JWT 的 payload，不做验签；格式不合法时返回 null。 */
export function decodeTokenPayload(token) {
  if (typeof token !== 'string') return null
  const segment = token.split('.')[1]
  if (!segment) return null
  try {
    const base64 = segment.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(segment.length / 4) * 4, '=')
    const binary = atob(base64)
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const payload = JSON.parse(new TextDecoder().decode(bytes))
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

/** token 的过期时间戳（毫秒）；没有 exp 或格式错误返回 0。 */
export function tokenExpiresAt(token) {
  const exp = decodeTokenPayload(token)?.exp
  return Number.isFinite(exp) ? exp * 1000 : 0
}

export function isSessionFresh(token, now = Date.now()) {
  if (!token) return false
  return tokenExpiresAt(token) - CLOCK_SKEW_MS > now
}

export function readRememberedAccount(storage = globalThis.localStorage) {
  try { return storage?.getItem(ACCOUNT_KEY) || '' } catch { return '' }
}

export function rememberAccount(account, storage = globalThis.localStorage) {
  try {
    const value = typeof account === 'string' ? account.trim() : ''
    if (value) storage?.setItem(ACCOUNT_KEY, value)
    else storage?.removeItem(ACCOUNT_KEY)
  } catch { /* 记忆账号失败不影响登录本身 */ }
}

/**
 * 决定访问根路径/登录页时该落到哪：
 * - 会话仍有效 → home（免密自动入席）
 * - 无 token 或已过期/损坏 → login，并顺手清掉废 token，避免进首页再被 416 踢回来
 */
export function resolveAuthEntry({ storage = globalThis.localStorage, now = Date.now() } = {}) {
  const token = readToken(storage)
  if (isSessionFresh(token, now)) return 'home'
  if (token) clearSessionToken(storage)
  return 'login'
}
