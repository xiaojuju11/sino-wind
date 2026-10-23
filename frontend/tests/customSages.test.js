import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'
import { webcrypto } from 'node:crypto'

async function fixture() {
  const storage = new Map(), events = new EventTarget()
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, String(value)),
    removeItem: key => storage.delete(key),
    key: i => Array.from(storage.keys())[i] || null,
    get length() { return storage.size }
  }
  const context = vm.createContext({
    localStorage,
    window: events,
    Event,
    CustomEvent,
    crypto: webcrypto,
    atob,
    console
  })
  const modules = new Map()
  const load = async name => {
    if (modules.has(name)) return modules.get(name)
    if (name === '../http') {
      const module = new vm.SyntheticModule(['default'], function () { this.setExport('default', {}) }, { context })
      modules.set(name, module)
      return module
    }
    const file = name.includes('scholarLetters') ? 'scholarLetters.js' : 'customSages.js'
    if (modules.has(file)) return modules.get(file)
    const source = await fs.readFile(new URL(`../src/utils/${file}`, import.meta.url), 'utf8')
    const module = new vm.SourceTextModule(source, { context })
    modules.set(file, module)
    await module.link(load)
    return module
  }
  const customSagesMod = await load('customSages')
  await customSagesMod.evaluate()
  return {
    customSages: customSagesMod.namespace,
    letters: modules.get('scholarLetters.js').namespace,
    localStorage,
    login: id => localStorage.setItem('token', `x.${Buffer.from(JSON.stringify({ id })).toString('base64url')}.x`),
    logout: () => localStorage.removeItem('token')
  }
}

test('custom sages are strictly isolated across different user accounts', async () => {
  const f = await fixture()

  // 1. User 1 logs in and adds "小橘"
  f.login(1)
  assert.equal(f.customSages.getCustomSages().length, 0)
  f.customSages.saveCustomSage({ id: 'sage_1001', name: '小橘', title: '橘隐山人' })
  assert.equal(f.customSages.getCustomSages().length, 1)
  assert.equal(f.customSages.getCustomSages()[0].name, '小橘')

  // 2. User 1 logs out -> guest should NOT see "小橘"
  f.logout()
  assert.equal(f.customSages.getCustomSages().length, 0)

  // 3. User 2 logs in (a brand new account) -> must NOT see User 1's "小橘"
  f.login(2)
  assert.equal(f.customSages.getCustomSages().length, 0)

  // 4. User 2 adds their own custom friend "大白"
  f.customSages.saveCustomSage({ id: 'sage_2002', name: '大白', title: '白云居士' })
  assert.equal(f.customSages.getCustomSages().length, 1)
  assert.equal(f.customSages.getCustomSages()[0].name, '大白')

  // 5. User 1 logs back in -> should see "小橘", NOT "大白"
  f.login(1)
  assert.equal(f.customSages.getCustomSages().length, 1)
  assert.equal(f.customSages.getCustomSages()[0].name, '小橘')
})

test('legacy unscoped custom sages are not leaked into a new user account', async () => {
  const f = await fixture()

  // Simulate an existing device that has an old account (user:1) with letters
  f.login(1)
  f.letters.saveLocalTurn('libai', { id: 'turn1', question: '你好', answer: '你好', at: Date.now() })
  
  // And legacy unscoped gufeng_custom_sages has "小橘"
  f.localStorage.setItem('gufeng_custom_sages', JSON.stringify([
    { id: 'sage_9999', name: '小橘', title: '橘隐山人' }
  ]))

  // Now a brand new user (user:2) logs in for the first time
  f.login(2)
  const newAccountSages = f.customSages.getCustomSages()
  
  // The new account MUST NOT inherit "小橘"!
  assert.equal(newAccountSages.length, 0)
  assert.equal(f.localStorage.getItem('gufeng_custom_sages'), null, 'legacy key is cleaned up')

  // When user 1 logs back in, user 1 should receive their migrated sage
  f.login(1)
  const user1Sages = f.customSages.getCustomSages()
  assert.equal(user1Sages.length, 1)
  assert.equal(user1Sages[0].name, '小橘')
})

test('prepending a custom sage is idempotent after the storage refresh event', async () => {
  const f = await fixture()
  const { prependUniqueSage } = f.customSages
  const existing = { id: 'sage_1001', name: '林徽因', title: '一代才女' }

  const refreshed = [existing, { id: 'libai', name: '李白' }]
  const next = prependUniqueSage(refreshed, { ...existing, status: '新交对席' })

  assert.equal(Array.from(next, item => item.id).join(','), 'sage_1001,libai')
  assert.equal(next.filter(item => item.id === 'sage_1001').length, 1)
  assert.equal(next[0].status, '新交对席')
})

test('saving the same custom sage name replaces the previous generated id', async () => {
  const f = await fixture()
  f.login(1)
  f.customSages.saveCustomSage({ id: 'sage_old', name: '林徽因', title: '一代才女' })
  f.customSages.saveCustomSage({ id: 'sage_new', name: ' 林徽因 ', title: '建筑学家' })

  const saved = f.customSages.getCustomSages()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].id, 'sage_new')
  assert.equal(saved[0].title, '建筑学家')
})

test('loading custom sages cleans duplicate names left by older versions', async () => {
  const f = await fixture()
  f.login(1)
  f.localStorage.setItem('scholar-custom-sages:v1:user:1', JSON.stringify([
    { id: 'sage_a', name: '林徽因', title: '旧记录' },
    { id: 'sage_b', name: ' 林徽因 ', title: '新记录' },
    { id: 'sage_c', name: '李白', title: '太白' }
  ]))

  const saved = f.customSages.getCustomSages()
  assert.equal(saved.length, 2)
  assert.equal(saved[0].id, 'sage_a')
  assert.equal(JSON.parse(f.localStorage.getItem('scholar-custom-sages:v1:user:1')).length, 2)
})
