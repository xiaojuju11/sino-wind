import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { transform } from 'esbuild'

const legacyFallback = { code: 1, data: { name: '宋代执壶 / 青白瓷汤瓶' }, degraded: true, source: 'local-fallback' }

async function mount(post) {
  const slots = [], toasts = [], requests = []
  let cursor = 0, tree
  const react = {
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], value => { slots[i] = value }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useCallback: fn => fn,
  }
  const context = vm.createContext({ console: { warn() {} } })
  const source = await fs.readFile(new URL('../src/pages/Recognition.jsx', import.meta.url), 'utf8')
  const { code } = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' })
  const module = new vm.SourceTextModule(code, { context })
  await module.link(name => {
    const exports = name === 'react' ? react
      : name === 'react/jsx-runtime' ? { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      : name === 'antd-mobile' ? { Toast: { show: value => toasts.push(value) } }
      : name === '../http' ? { default: { post: (...args) => { requests.push(args); return post(...args) } } }
      : name.includes('imageCaptureAndProcess') ? { default: 'Capture' }
      : { default: 'Result', RecognitionSkeleton: 'Skeleton' }
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
    }, { context })
  })
  await module.evaluate()
  const render = () => { cursor = 0; tree = module.namespace.default() }
  render()
  return { toasts, requests, render, get tree() { return tree }, recognize: image => tree.props.onRecognition(image) }
}
function nodes(tree, predicate) {
  if (Array.isArray(tree)) return tree.flatMap(node => nodes(node, predicate))
  if (!tree || typeof tree !== 'object') return []
  return [...(predicate(tree) ? [tree] : []), ...nodes(tree.props?.children, predicate)]
}

for (const [label, response] of [
  ['network failure', () => Promise.reject(new Error('Network Error'))],
  ['legacy degraded response', async () => ({ data: legacyFallback })],
  ['business failure', async () => ({ data: { code: 0, message: '识物服务暂不可用' } })],
]) {
  test(`${label} shows a retryable error without a fixed artifact or success toast`, async () => {
    const page = await mount(response)
    await page.recognize('data:image/png;base64,Y3Vw'); page.render()
    assert.equal(nodes(page.tree, node => node.type === 'Result').length, 0)
    assert.equal(nodes(page.tree, node => node.props?.role === 'alert').length, 1)
    assert.equal(page.toasts.some(toast => toast.icon === 'success'), false)
    const retry = nodes(page.tree, node => node.type === 'button')[0]
    assert.ok(retry, 'offer retry for the selected image')
    await retry.props.onClick()
    assert.equal(page.requests[1][1].img, 'data:image/png;base64,Y3Vw')
  })
}

test('new photos are sent independently and render their real results', async () => {
  const page = await mount(async (_url, body) => ({ data: { code: 1, data: { name: body.img === 'cup' ? '茶盏' : '花瓶' } } }))
  await page.recognize('cup'); page.render()
  assert.equal(nodes(page.tree, node => node.type === 'Result')[0].props.recognitionResult.data.name, '茶盏')
  await page.recognize('vase'); page.render()
  assert.equal(nodes(page.tree, node => node.type === 'Result')[0].props.recognitionResult.data.name, '花瓶')
  assert.equal(page.requests[1][1].img, 'vase')
})

test('a late response cannot replace the newer selected photo', async () => {
  let resolveFirst
  const page = await mount(async (_url, body) => body.img === 'first'
    ? new Promise(resolve => { resolveFirst = resolve })
    : { data: { code: 1, data: { name: '新照片' } } })
  const first = page.recognize('first')
  await page.recognize('second')
  resolveFirst({ data: { code: 1, data: { name: '旧照片' } } })
  await first; page.render()
  assert.equal(nodes(page.tree, node => node.type === 'Result')[0].props.recognitionResult.data.name, '新照片')
})

test('the service failure reason is shown and retry can recover a real result', async () => {
  let failed = true
  const page = await mount(async () => {
    if (failed) throw { response: { data: { message: '识物服务授权失效' } } }
    return { data: { code: 1, data: { name: '茶盏' } } }
  })
  await page.recognize('cup'); page.render()
  const error = nodes(page.tree, node => node.props?.role === 'alert')[0]
  assert.equal(nodes(error, node => node.type === 'p')[0].props.children, '识物服务授权失效')
  failed = false
  await nodes(error, node => node.type === 'button')[0].props.onClick(); page.render()
  assert.equal(nodes(page.tree, node => node.props?.role === 'alert').length, 0)
  assert.equal(nodes(page.tree, node => node.type === 'Result')[0].props.recognitionResult.data.name, '茶盏')
})
