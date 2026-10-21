import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'

async function loadSessionModule() {
  const source = await fs.readFile(new URL('../src/utils/session.js', import.meta.url), 'utf8')
  const context = vm.createContext({ atob, TextDecoder })
  const module = new vm.SourceTextModule(source, { context })
  await module.link(() => { throw new Error('unexpected import') })
  await module.evaluate()
  return module.namespace
}

const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const makeToken = (payload) => `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.signature`

function createStorage(entries = {}) {
  const map = new Map(Object.entries(entries))
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, value) => { map.set(key, String(value)) },
    removeItem: (key) => { map.delete(key) },
    has: (key) => map.has(key),
  }
}

test('an unexpired token keeps the session fresh and an expired one does not', async () => {
  const { isSessionFresh, tokenExpiresAt } = await loadSessionModule()
  const now = Date.UTC(2026, 9, 21, 6, 0, 0)
  const fresh = makeToken({ id: 7, exp: Math.floor((now + 6 * 86400_000) / 1000) })
  const expired = makeToken({ id: 7, exp: Math.floor((now - 1000) / 1000) })
  assert.equal(tokenExpiresAt(fresh), Math.floor((now + 6 * 86400_000) / 1000) * 1000)
  assert.equal(isSessionFresh(fresh, now), true)
  assert.equal(isSessionFresh(expired, now), false)
  // 无 exp / 非 JWT / 空值一律按失效处理
  assert.equal(isSessionFresh(makeToken({ id: 7 }), now), false)
  assert.equal(isSessionFresh('not-a-jwt', now), false)
  assert.equal(isSessionFresh('', now), false)
})

test('a token expiring within the clock-skew window is already treated as expired', async () => {
  const { isSessionFresh } = await loadSessionModule()
  const now = Date.UTC(2026, 9, 21, 6, 0, 0)
  const almost = makeToken({ id: 7, exp: Math.floor((now + 10_000) / 1000) })
  assert.equal(isSessionFresh(almost, now), false)
})

test('entering with a valid session goes straight home, without asking for a password', async () => {
  const { resolveAuthEntry } = await loadSessionModule()
  const storage = createStorage({ token: makeToken({ id: 7, exp: Math.floor(Date.now() / 1000) + 7 * 86400 }) })
  assert.equal(resolveAuthEntry({ storage }), 'home')
  assert.equal(storage.has('token'), true)
})

test('a missing, expired or malformed token falls back to login and is cleaned up', async () => {
  const { resolveAuthEntry } = await loadSessionModule()
  const now = Date.now()
  const empty = createStorage()
  assert.equal(resolveAuthEntry({ storage: empty, now }), 'login')

  const expired = createStorage({ token: makeToken({ id: 7, exp: Math.floor((now - 60_000) / 1000) }) })
  assert.equal(resolveAuthEntry({ storage: expired, now }), 'login')
  assert.equal(expired.has('token'), false, 'expired token must not linger and cause a 416 redirect')

  const broken = createStorage({ token: 'garbage' })
  assert.equal(resolveAuthEntry({ storage: broken, now }), 'login')
  assert.equal(broken.has('token'), false)
})

test('only the account name is remembered locally — never a password', async () => {
  const { rememberAccount, readRememberedAccount } = await loadSessionModule()
  const storage = createStorage()
  assert.equal(readRememberedAccount(storage), '')
  rememberAccount('  13800001111 ', storage)
  assert.equal(readRememberedAccount(storage), '13800001111')
  assert.equal(storage.has('password'), false, 'password must never be written to storage')
  rememberAccount('   ', storage)
  assert.equal(readRememberedAccount(storage), '')
})

test('unavailable storage never breaks sign-in or sign-out', async () => {
  const { resolveAuthEntry, readRememberedAccount, rememberAccount } = await loadSessionModule()
  const broken = { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') }, removeItem() { throw new Error('blocked') } }
  assert.equal(resolveAuthEntry({ storage: broken }), 'login')
  assert.equal(readRememberedAccount(broken), '')
  assert.doesNotThrow(() => rememberAccount('13800001111', broken))
})
