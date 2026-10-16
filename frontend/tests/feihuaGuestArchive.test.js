import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { transform } from 'esbuild'

async function fixture({ restore = false, quotaFails = false } = {}) {
  const slots = [], effects = [], saved = []
  let cursor = 0
  const game = { id: 'completed-game', version: 1, sageId: 'libai', keyword: '月', rhyme: '', turns: [], status: 'finished', settled: true, pointsAwarded: 0, serverNow: Date.now() }
  const playing = { ...game, version: 0, status: 'playing', settled: false, guestKey: 'guest-credential' }
  const hooks = {
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value }] },
    useRef: initial => { const i = cursor++; return slots[i] ||= { current: initial } },
    useEffect: (callback, deps) => { const i = cursor++; if (!slots[i] || deps?.some((dep, n) => dep !== slots[i].deps[n])) { slots[i] = { deps }; effects.push(callback) } },
  }
  const axios = { get: async () => ({ data: { data: { keywords: ['月'], poems: [], sages: {} } } }), post: async url => ({ data: { data: url.endsWith('/start') ? playing : game } }) }
  const deps = {
    react: hooks, 'antd-mobile-icons': { DownlandOutline() {}, CloseOutline() {} }, '../http': { default: axios },
    '../utils/scholarCertificate': { downloadScholarCertificate: async () => {} },
    '../utils/scholarAssets': { rememberGuestGame: value => { if (quotaFails) throw new Error('quota'); saved.push(value); return true } },
  }
  const context = vm.createContext({ __jsx: (type, props, ...children) => ({ type, props: props || {}, children: children.flat(Infinity) }),
    __fragment: Symbol('fragment'), Date, Event, window: { dispatchEvent() {} },
    sessionStorage: { getItem: () => restore ? JSON.stringify({ id: game.id, version: 0, guestKey: 'guest-credential' }) : null, setItem() {}, removeItem() {} },
    setInterval: () => 1, clearInterval() {},
  })
  const source = await fs.readFile(new URL('../src/components/FeihuaPanel.jsx', import.meta.url), 'utf8')
  const output = await transform(source, { loader: 'jsx', format: 'esm', jsxFactory: '__jsx', jsxFragment: '__fragment' })
  const module = new vm.SourceTextModule(output.code, { context })
  await module.link(name => {
    assert.ok(deps[name], `unexpected dependency ${name}`)
    return new vm.SyntheticModule(Object.keys(deps[name]), function () { for (const [key, value] of Object.entries(deps[name])) this.setExport(key, value) }, { context })
  })
  await module.evaluate()
  const render = () => { cursor = 0; return module.namespace.default({ sageId: 'libai', onClose() {} }) }
  render(); effects.splice(0).forEach(effect => effect()); await new Promise(resolve => setImmediate(resolve))
  return { render, saved, game }
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of node.children || []) { const found = find(child, predicate); if (found) return found }
}
const text = node => typeof node === 'string' ? node : (node?.children || []).map(text).join('')

test('a guest settlement from a normal game is passed to the local archive', async () => {
  const f = await fixture()
  await find(f.render(), node => node.type === 'button' && text(node) === '开席行令').props.onClick()
  await find(f.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(f.saved.length, 1)
  assert.equal(f.saved[0].id, f.game.id)
})

test('restoring a completed guest game also persists its certificate', async () => {
  const f = await fixture({ restore: true })
  assert.equal(f.saved.length, 1)
  assert.equal(f.saved[0].id, f.game.id)
})

test('archive quota failures do not misreport the confirmed settlement as a failed turn', async () => {
  const f = await fixture({ quotaFails: true })
  await find(f.render(), node => node.type === 'button' && text(node) === '开席行令').props.onClick()
  await find(f.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  await new Promise(resolve => setImmediate(resolve))
  assert.match(text(f.render()), /本机.*保存/)
  assert.doesNotMatch(text(f.render()), /本轮未确认/)
})
