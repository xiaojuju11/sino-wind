import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { transform } from 'esbuild'

// Exercise the actual JSX, effects and event handlers without a browser dependency.
async function mount(page, { token = 'account-a', saved = null, get } = {}) {
  const storage = new Map(token ? [['token', token]] : [])
  if (saved !== null) storage.set('gufeng_yayan_list', saved)
  const requests = [], toasts = [], events = new EventTarget(), slots = [], pendingEffects = []
  const transport = { get: get || (async () => ({ data: { code: 1, data: [] } })), post: async () => ({ data: { code: 1, removed: true } }) }
  let cursor = 0, dirty = false, tree, confirm
  const react = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial
      return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; dirty = true }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(effect, deps) {
      const i = cursor++, previous = slots[i]
      if (!previous || deps.some((value, index) => value !== previous.deps[index])) {
        slots[i] = { deps, cleanup: previous?.cleanup }
        pendingEffects.push(() => { slots[i].cleanup?.(); slots[i].cleanup = effect() })
      }
    },
  }
  const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) }
  const axios = Object.fromEntries(['get', 'post'].map(method => [method, (...args) => { requests.push([method, ...args]); return transport[method](...args) }]))
  const scope = () => localStorage.getItem('token') ? `user:${localStorage.getItem('token')}` : 'guest'
  const context = vm.createContext({ localStorage, window: events, Event, navigator: {}, setTimeout, clearTimeout, console })
  const source = await fs.readFile(new URL(`../src/pages/${page}.jsx`, import.meta.url), 'utf8')
  const { code } = await transform(source, { loader: 'jsx', format: 'esm', define: { 'import.meta.env.BASE_URL': '"/"' } })
  const module = new vm.SourceTextModule(code, { context })
  await module.link(async name => {
    let exports
    if (name === 'react') exports = { default: react, ...react }
    else if (name === 'react-router-dom') exports = { useNavigate: () => () => {} }
    else if (name === '../http') exports = { default: axios }
    else if (name === 'antd-mobile') exports = { Toast: { show: value => toasts.push(value) }, Modal: { confirm: value => { confirm = value } }, Popup: 'Popup', ActionSheet: 'ActionSheet', ImageViewer: 'ImageViewer' }
    else if (name === 'antd-mobile-icons') exports = Object.fromEntries(['LeftOutline', 'SearchOutline', 'FileOutline', 'RightOutline', 'HeartOutline', 'CloseOutline'].map(key => [key, key]))
    else if (name.includes('useScholarScope')) exports = { useScholarScope: scope }
    else if (name.includes('scholarLetters')) exports = { scholarScope: scope, syncLocalLetters: async () => {} }
    else if (name.includes('scholarAssets')) exports = { guestSummary: () => ({}), guestArchiveCount: () => 0, importGuestArchive: async () => {}, guestGames: () => [] }
    else exports = { default: name.includes('EmptyState') ? 'EmptyState' : 'DecorativeComponent' }
    return new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value) }, { context })
  })
  await module.evaluate()
  const render = () => {
    cursor = 0; dirty = false
    tree = module.namespace.default()
    // Personal pages may key their session component by account identity.
    while (typeof tree?.type === 'function') tree = tree.type(tree.props)
    while (pendingEffects.length) pendingEffects.shift()()
  }
  const flush = async () => {
    for (let i = 0; i < 8; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty) render() }
  }
  render()
  return { transport, requests, toasts, events, localStorage, flush,
    get tree() { return tree },
    confirm: () => confirm?.onConfirm(),
    unmount: () => slots.forEach(slot => slot?.cleanup?.()),
  }
}

function nodes(tree, predicate) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(child => nodes(child, predicate))
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)]
}
function text(tree) {
  if (tree == null || typeof tree === 'boolean') return ''
  if (typeof tree !== 'object') return String(tree)
  if (Array.isArray(tree)) return tree.map(text).join('')
  return tree.type === 'EmptyState' ? [tree.props.title, tree.props.desc, tree.props.actionText].join(' ') : text(tree.props?.children)
}
const cards = f => nodes(f.tree, node => node.type === 'article')
const empty = f => nodes(f.tree, node => node.type === 'EmptyState')[0]
const remove = f => nodes(f.tree, node => node.props?.className === 'poem-card__del-btn')[0].props.onClick({ stopPropagation() {} })
const poem = { id: 41, title: '真实收藏', author: '苏轼', content: '人间有味是清欢' }
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

test('collection starts with loading, then honors a real empty server list', async () => {
  const f = await mount('PoemCollection')
  assert.equal(cards(f).length, 0)
  assert.match(text(f.tree), /载入|加载/)
  await f.flush()
  assert.equal(cards(f).length, 0)
  assert.match(text(f.tree), /暂无诗笺/)
  f.unmount()
})

test('guest collection never sends an authenticated request', async () => {
  const f = await mount('PoemCollection', { token: null }); await f.flush()
  assert.equal(f.requests.length, 0)
  assert.equal(cards(f).length, 0)
  assert.match(text(f.tree), /登录|入席/)
  f.unmount()
})

async function loadedPoem() {
  const f = await mount('PoemCollection', { get: async () => ({ data: { code: 1, data: [poem] } }) })
  await f.flush()
  assert.equal(cards(f).length, 1)
  return f
}

test('failed collection reads show a retry action and recover real data', async () => {
  const f = await mount('PoemCollection', { get: async () => { throw new Error('offline') } }); await f.flush()
  assert.match(text(f.tree), /失败|未能|暂未获取/)
  assert.equal(cards(f).length, 0)
  assert.match(empty(f)?.props.actionText || '', /重试/)
  f.transport.get = async () => ({ data: { code: 1, data: [poem] } })
  empty(f).props.onAction(); await f.flush()
  assert.equal(cards(f).length, 1)
  f.unmount()
})

for (const data of [{ code: 0, data: [] }, { code: 1, data: null }]) test('an invalid list response is an error, never a successful empty collection', async () => {
  const f = await mount('PoemCollection', { get: async () => ({ data }) }); await f.flush()
  assert.equal(cards(f).length, 0)
  assert.match(empty(f)?.props.actionText || '', /重试/)
  f.unmount()
})

for (const [name, response] of [
  ['network rejection', () => Promise.reject(new Error('offline'))],
  ['business rejection', () => Promise.resolve({ data: { code: 0, message: '未获确认' } })],
  ['malformed success', () => Promise.resolve({ data: {} })],
]) test(`removal preserves the poem on ${name}`, async () => {
  const f = await loadedPoem(); let updates = 0
  f.events.addEventListener('userInfoUpdated', () => updates++)
  f.transport.post = response
  remove(f); await f.confirm(); await f.flush()
  assert.equal(cards(f).length, 1)
  assert.equal(updates, 0)
  assert.ok(f.toasts.some(toast => toast.icon === 'fail'))
  assert.ok(!f.toasts.some(toast => toast.icon === 'success'))
  f.unmount()
})

test('removal waits for server confirmation and updates the scholar summary once', async () => {
  const f = await loadedPoem(), pending = deferred(); let updates = 0
  f.events.addEventListener('userInfoUpdated', () => updates++)
  f.transport.post = () => pending.promise
  remove(f); const done = f.confirm(); await f.flush()
  assert.equal(cards(f).length, 1)
  assert.equal(updates, 0)
  pending.resolve({ data: { code: 1, removed: true } }); await done; await f.flush()
  assert.equal(cards(f).length, 0)
  assert.equal(updates, 1)
  assert.equal(f.toasts.at(-1).icon, 'success')
  f.unmount()
})

test('a failed removal unlocks the action for a successful retry', async () => {
  const f = await loadedPoem()
  f.transport.post = async () => { throw new Error('offline') }
  remove(f); await f.confirm(); await f.flush()
  assert.equal(cards(f).length, 1)
  assert.equal(nodes(f.tree, node => node.props?.className === 'poem-card__del-btn')[0].props.disabled, false)
  f.transport.post = async () => ({ data: { code: 1, removed: true } })
  remove(f); await f.confirm(); await f.flush()
  assert.equal(cards(f).length, 0)
  f.unmount()
})

test('logging out while the confirmation is open never sends a removal request', async () => {
  const f = await loadedPoem(); remove(f)
  f.localStorage.removeItem('token'); await f.confirm(); await f.flush()
  assert.equal(f.requests.filter(([method]) => method === 'post').length, 0)
  f.unmount()
})

test('an account change before opening removal cannot delete the new account poem', async () => {
  const f = await loadedPoem()
  f.localStorage.setItem('token', 'account-b')
  remove(f)
  // Either reject before opening the modal or when its callback runs.
  await f.confirm(); await f.flush()
  assert.equal(f.requests.filter(([method]) => method === 'post').length, 0)
  f.unmount()
})

test('a confirmed removal still refreshes summary if the page closed while waiting', async () => {
  const f = await loadedPoem(), pending = deferred(); let updates = 0
  f.events.addEventListener('userInfoUpdated', () => updates++)
  f.transport.post = () => pending.promise
  remove(f); const done = f.confirm()
  f.unmount()
  pending.resolve({ data: { code: 1, removed: true } }); await done
  assert.equal(updates, 1)
})

test('duplicate confirms send only one removal and search still uses real items', async () => {
  const f = await loadedPoem(), pending = deferred()
  f.transport.post = () => pending.promise
  const input = nodes(f.tree, node => node.type === 'input')[0]
  input.props.onChange({ target: { value: 'no-match' } }); await f.flush()
  assert.equal(cards(f).length, 0)
  empty(f).props.onAction(); await f.flush()
  assert.equal(cards(f).length, 1)
  remove(f); const done = f.confirm(); await f.confirm(); await f.flush()
  assert.equal(f.requests.filter(([method]) => method === 'post').length, 1)
  assert.ok(nodes(f.tree, node => node.props?.className === 'poem-card__del-btn')[0].props.disabled)
  pending.resolve({ data: { code: 1, removed: false } }); await done; await f.flush()
  assert.equal(cards(f).length, 0, 'server-confirmed absence is an idempotent success')
  f.unmount()
})

async function openYayan(f) {
  nodes(f.tree, node => node.props?.className === 'shuzhai-list-item' && text(node).includes('雅译锦囊'))[0].props.onClick()
  await f.flush()
  return nodes(f.tree, node => node.type === 'Popup' && node.props.visible)[0]
}

test('yayan drawer reads home excerpts on every open and preserves source metadata', async () => {
  const f = await mount('MinePage', { token: null })
  await f.flush()
  f.localStorage.setItem('gufeng_yayan_list', JSON.stringify([
    { id: 1, ancient: '一期一会', modern: '珍惜相遇', author: '雅译署名', explanation: '此次相逢尤可珍重', offline: false, createdAt: '2026/10/16' },
    { id: 2, ancient: '且尽一杯', modern: '先喝一杯', offline: true },
    null, { ancient: { invalid: true } },
  ]))
  const drawer = await openYayan(f), content = text(drawer)
  for (const value of ['一期一会', '珍惜相遇', '雅译署名', '此次相逢尤可珍重', '2026/10/16', '在线', '离线']) assert.ok(content.includes(value), value)
  assert.equal(nodes(drawer, node => node.props?.className === 'yayan-box__item').length, 2)
  nodes(drawer, node => node.props?.className === 'yayan-box__close')[0].props.onClick(); await f.flush()
  f.localStorage.setItem('gufeng_yayan_list', JSON.stringify([{ ancient: '新摘录', modern: '重新开卷可见' }]))
  assert.match(text(await openYayan(f)), /新摘录/)
  assert.equal(f.requests.length, 0)
  f.unmount()
})

test('unreadable yayan storage is retained and a retry recovers the original excerpts', async () => {
  const f = await mount('MinePage', { token: null, saved: '{broken' })
  const drawer = await openYayan(f)
  assert.equal(f.localStorage.getItem('gufeng_yayan_list'), '{broken')
  f.localStorage.setItem('gufeng_yayan_list', JSON.stringify([{ ancient: '修复后原稿' }]))
  nodes(drawer, node => node.type === 'EmptyState')[0].props.onAction(); await f.flush()
  assert.match(text(f.tree), /修复后原稿/)
  f.unmount()
})

for (const saved of [null, '[]', '[null,{}]', '{broken', '{}']) test(`yayan with ${saved} never substitutes preset user excerpts`, async () => {
  const f = await mount('MinePage', { token: null, saved })
  const drawer = await openYayan(f)
  assert.equal(nodes(drawer, node => node.props?.className === 'yayan-box__item').length, 0)
  assert.match(text(drawer), /尚无|暂无|未能读取/)
  f.unmount()
})
