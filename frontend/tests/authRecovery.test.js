import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import vm from 'node:vm'
import { transform } from 'esbuild'

const CODE = Array(8).fill('ABCDEF').join('-')
const PASSWORD = 'test-pass-123'

// Run the real page JSX and nested recovery card with independent hook state.
// The transport models the shared auth interceptor, including deferred dispatch.
async function mount(page, { token = 'account-a', post, props = {} } = {}) {
  const storage = new Map(token ? [['token', token]] : [])
  const storageWrites = [], requests = [], toasts = [], navigations = [], events = new EventTarget()
  const fibers = new Map(), pendingEffects = [], modules = new Map()
  let current, cursor, dirty = false, tree, mounted = true, visited
  const localStorage = {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => { storageWrites.push([key, value]); storage.set(key, String(value)) },
    removeItem: key => { storageWrites.push([key, null]); storage.delete(key) },
  }
  const react = {
    useState(initial) {
      const fiber = current, index = cursor++
      if (!(index in fiber.slots)) fiber.slots[index] = typeof initial === 'function' ? initial() : initial
      return [fiber.slots[index], value => {
        fiber.slots[index] = typeof value === 'function' ? value(fiber.slots[index]) : value
        dirty = true
      }]
    },
    useRef(initial) { const index = cursor++; return current.slots[index] ??= { current: initial } },
    useCallback(callback, deps) {
      const index = cursor++, previous = current.slots[index]
      if (!previous || deps.some((value, i) => value !== previous.deps[i])) current.slots[index] = { callback, deps }
      return current.slots[index].callback
    },
    useEffect(effect, deps) {
      const fiber = current, index = cursor++, previous = fiber.slots[index]
      if (!previous || !deps || deps.some((value, i) => value !== previous.deps?.[i])) {
        fiber.slots[index] = { deps, cleanup: previous?.cleanup }
        pendingEffects.push(() => {
          if (!visited.has(fiber.key)) return
          fiber.slots[index].cleanup?.()
          fiber.slots[index].cleanup = effect()
        })
      }
    },
  }
  const transport = {
    beforeDispatch: null,
    get: async url => url.endsWith('/captcha')
      ? { data: { code: 1, captchaId: 'captcha-test', captchaSvg: '<svg></svg>' } }
      : { data: { code: 1, nickname: 'Account A', phone: '13800000000', avatar: '' } },
    post: post || (async () => ({ data: { code: 1, data: { recoveryCode: CODE } } })),
  }
  const axios = {
    get: async (...args) => { requests.push(['get', ...args]); return transport.get(...args) },
    post: async (url, body, config = {}) => {
      await Promise.resolve()
      transport.beforeDispatch?.()
      const headers = new Map([['Authorization', localStorage.getItem('token')]])
      let payload = body
      for (const transformRequest of config.transformRequest || []) payload = transformRequest(payload, headers)
      if (config.signal?.aborted) throw new Error('request aborted')
      const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
      requests.push(['post', url, parsed, { headers, signal: config.signal }])
      const response = await transport.post(url, parsed, config)
      // The production ../http module rejects business failures before page handlers.
      if (response.data?.code !== 1) throw response
      return response
    },
  }
  const sessionStorage = { ...localStorage, setItem: (key, value) => storageWrites.push(['session:' + key, value]) }
  const context = vm.createContext({ localStorage, sessionStorage, window: events, Event, AbortController,
    navigator: {}, Blob, URL, setTimeout, clearTimeout, console })
  const iconSource = await fs.readFile(new URL('../node_modules/antd-mobile-icons/es/index.js', import.meta.url), 'utf8')
  const icons = Object.fromEntries([...iconSource.matchAll(/default as (\w+)/g)].map(match => [match[1], match[1]]))
  const synthetic = exports => new vm.SyntheticModule(Object.keys(exports), function () {
    for (const [key, value] of Object.entries(exports)) this.setExport(key, value)
  }, { context })
  const load = async file => {
    if (modules.has(file)) return modules.get(file)
    const source = await fs.readFile(new URL('../src/' + file, import.meta.url), 'utf8')
    const { code } = await transform(source, { loader: 'jsx', jsx: 'automatic', format: 'esm' })
    const module = new vm.SourceTextModule(code, { context })
    modules.set(file, module)
    await module.link(async name => {
      if (name === 'react') return synthetic({ ...react, default: react })
      if (name === 'react/jsx-runtime') return synthetic({ jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'Fragment' })
      if (name === 'react-router-dom') return synthetic({ Link: 'Link', useNavigate: () => (...args) => navigations.push(args) })
      if (name === '../http') return synthetic({ default: axios })
      if (name === 'antd-mobile-icons') return synthetic(icons)
      if (name === 'antd-mobile') return synthetic({ Toast: { show: value => toasts.push(value) }, List: { Item: 'List.Item' }, Avatar: 'Avatar', ActionSheet: 'ActionSheet', Popup: 'Popup', Button: 'Button', Input: 'Input' })
      if (name.includes('chunkUpload')) return synthetic({ uploadFileChunks: async () => {}, DEFAULT_CHUNK_SIZE: 1024 })
      if (name.includes('RecoveryCodeCard')) return load('components/RecoveryCodeCard.jsx')
      if (name === './Login') return load('pages/Login.jsx')
      if (name === './Register') return load('pages/Register.jsx')
      return synthetic({ default: 'DecorativeComponent' })
    })
    return module
  }
  const module = await load('pages/' + page + '.jsx')
  await module.evaluate()
  const expand = (node, path = 'root') => {
    if (Array.isArray(node)) return node.map((child, index) => expand(child, path + '.' + index))
    if (!node || typeof node !== 'object') return node
    if (typeof node.type === 'function') {
      const key = path + ':' + node.type.name
      let fiber = fibers.get(key)
      if (!fiber) { fiber = { key, slots: [] }; fibers.set(key, fiber) }
      visited.add(key)
      current = fiber; cursor = 0
      return expand(node.type(node.props), key)
    }
    return { ...node, props: { ...node.props, children: expand(node.props?.children, path + '.children') } }
  }
  const cleanup = fiber => fiber.slots.forEach(slot => slot?.cleanup?.())
  const render = () => {
    dirty = false; visited = new Set()
    tree = expand({ type: module.namespace.default, props })
    for (const [key, fiber] of fibers) if (!visited.has(key)) { cleanup(fiber); fibers.delete(key) }
    while (pendingEffects.length) pendingEffects.shift()()
  }
  const flush = async () => {
    for (let i = 0; i < 8; i++) { await new Promise(resolve => setImmediate(resolve)); if (dirty && mounted) render() }
  }
  render()
  return {
    transport, requests, toasts, navigations, events, localStorage, storageWrites, flush,
    get tree() { return tree },
    changeToken(value, announce = true) {
      if (value) storage.set('token', value); else storage.delete('token')
      if (announce) { const event = new Event('storage'); Object.defineProperty(event, 'key', { value: 'token' }); events.dispatchEvent(event) }
    },
    unmount() { mounted = false; fibers.forEach(cleanup); fibers.clear() },
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
  return text(tree.props?.children)
}
const byId = (f, id) => nodes(f.tree, node => node.props?.id === id)[0]
const codeCard = f => nodes(f.tree, node => node.props?.className === 'recovery-code')[0]
const posts = f => f.requests.filter(([method]) => method === 'post')
const fill = async (f, id, value) => { byId(f, id).props.onChange({ target: { value } }); await f.flush() }
const submit = f => nodes(f.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} })
function deferred() { let resolve, reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no }); return { promise, resolve, reject } }

async function readyAccount() {
  const f = await mount('AccountSetting'); await f.flush()
  nodes(f.tree, node => node.type === 'List.Item' && text(node) === '账号恢复码')[0].props.onClick()
  await f.flush()
  await fill(f, 'recovery-current-password', PASSWORD)
  return f
}
async function readyReset(account = '13800000000') {
  const f = await mount('ForgotPassword', { token: null })
  await fill(f, 'recover-account', account)
  await fill(f, 'recover-code', CODE)
  await fill(f, 'recover-password', PASSWORD)
  await fill(f, 'recover-confirm', PASSWORD)
  return f
}

test('switching accounts before recovery generation blocks the request and clears the password', async () => {
  const f = await readyAccount()
  f.changeToken('account-b', false)
  await submit(f); await f.flush()
  assert.equal(posts(f).length, 0)
  assert.equal(byId(f, 'recovery-current-password').props.value, '')
  assert.equal(byId(f, 'recovery-current-password').props.disabled, true)
  assert.match(text(f.tree), /身份已变化/)
  assert.equal(codeCard(f), undefined)
  f.unmount()
})

test('an account switch inside the deferred shared interceptor cannot dispatch a rotation', async () => {
  const f = await readyAccount()
  f.transport.beforeDispatch = () => f.changeToken('account-b', false)
  await submit(f); await f.flush()
  assert.equal(posts(f).length, 0)
  assert.equal(codeCard(f), undefined)
  assert.equal(byId(f, 'recovery-current-password').props.value, '')
  f.unmount()
})

test('a late recovery response after switching accounts is discarded even without a storage event', async () => {
  const f = await readyAccount(), pending = deferred()
  f.transport.post = () => pending.promise
  const done = submit(f); await f.flush()
  assert.equal(posts(f).length, 1)
  assert.equal(posts(f)[0][3].headers.get('Authorization'), 'account-a')
  f.changeToken('account-b', false)
  pending.resolve({ data: { code: 1, data: { recoveryCode: CODE } } })
  await done; await f.flush()
  assert.equal(codeCard(f), undefined)
  assert.equal(byId(f, 'recovery-current-password').props.disabled, true)
  assert.equal(f.storageWrites.length, 0)
  f.unmount()
})

test('storage identity change erases an already-displayed code and blocks reuse after switching back', async () => {
  const f = await readyAccount()
  await submit(f); await f.flush()
  assert.equal(byId(f, 'account-recovery-code').props.value, CODE)
  f.changeToken('account-b'); await f.flush()
  assert.equal(codeCard(f), undefined)
  f.changeToken('account-a'); await f.flush()
  await submit(f); await f.flush()
  assert.equal(posts(f).length, 1)
  assert.equal(byId(f, 'recovery-current-password').props.disabled, true)
  assert.equal(f.storageWrites.length, 0)
  f.unmount()
})

test('duplicate recovery submits dispatch once and a server rejection keeps the form retryable', async () => {
  const f = await readyAccount(), pending = deferred()
  f.transport.post = () => pending.promise
  const done = submit(f); await submit(f); await f.flush()
  assert.equal(posts(f).length, 1)
  pending.reject({ response: { data: { message: '当前密码不正确' } } })
  await done; await f.flush()
  assert.equal(codeCard(f), undefined)
  assert.match(text(f.tree), /当前密码不正确/)
  assert.equal(byId(f, 'recovery-current-password').props.disabled, false)
  f.unmount()
})

for (const [label, response] of [
  ['network error', () => Promise.reject(new Error('offline'))],
  ['business rejection', () => Promise.resolve({ data: { code: 0, message: '恢复码无效' } })],
]) test('password reset never claims success or navigates on ' + label, async () => {
  const f = await readyReset()
  f.transport.post = response
  await submit(f); await f.flush()
  assert.equal(codeCard(f), undefined)
  assert.equal(f.navigations.length, 0)
  assert.equal(byId(f, 'recover-password').props.value, PASSWORD)
  assert.equal(nodes(f.tree, node => node.props?.role === 'alert').length, 1)
  assert.equal(nodes(f.tree, node => node.type === 'button' && node.props.type === 'submit')[0].props.disabled, false)
  assert.equal(f.storageWrites.length, 0)
  f.unmount()
})

test('reset validates confirmation before sending and accepts the existing supported-email account format', async () => {
  const f = await readyReset('Reader@qq.com')
  await fill(f, 'recover-confirm', 'different-password')
  await submit(f); await f.flush()
  assert.equal(posts(f).length, 0)
  await fill(f, 'recover-confirm', PASSWORD)
  await submit(f); await f.flush()
  assert.equal(posts(f)[0][2].phone, 'Reader@qq.com')
  assert.equal(posts(f)[0][2].recoveryCode, CODE.replaceAll('-', ''))
  assert.equal(byId(f, 'account-recovery-code').props.value, CODE)
  assert.equal(f.navigations.length, 0)
  assert.equal(f.storageWrites.length, 0)
  const done = nodes(f.tree, node => node.props?.className === 'recovery-code__done')[0]
  assert.equal(done.props.disabled, true)
  nodes(f.tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } })
  await f.flush()
  const confirmed = nodes(f.tree, node => node.props?.className === 'recovery-code__done')[0]
  assert.equal(confirmed.props.disabled, false)
  confirmed.props.onClick(); await f.flush()
  assert.equal(f.navigations[0][0], '/login')
  assert.equal(codeCard(f), undefined)
  f.unmount()
})

test('registration displays the new code only in memory and requires saved confirmation before returning to login', async () => {
  const f = await mount('AuthPage', { token: null, post: async () => ({ data: { code: 1, recoveryCode: CODE } }) })
  byId(f, 'auth-tab-register').props.onClick(); await f.flush()
  const field = name => nodes(f.tree, node => node.type === 'input' && node.props.name === name)[0]
  field('nickname').props.onChange({ target: { value: '测试雅士' } }); await f.flush()
  field('username').props.onChange({ target: { value: '13800000000' } }); await f.flush()
  await fill(f, 'register-password', PASSWORD)
  await fill(f, 'register-captcha', 'ABCD')
  nodes(f.tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } })
  await f.flush()
  await submit(f); await f.flush()
  assert.equal(posts(f).length, 1)
  assert.equal(posts(f)[0][1], '/api/auth/register')
  assert.equal(byId(f, 'account-recovery-code').props.value, CODE)
  assert.equal(nodes(f.tree, node => node.props?.className === 'recovery-code__done')[0].props.disabled, true)
  assert.equal(f.storageWrites.length, 0, 'neither password, recovery code nor token is persisted')
  assert.equal(f.navigations.length, 0, 'registration must not automatically log in')
  const copy = nodes(f.tree, node => node.type === 'button' && text(node).includes('复制密笺'))[0]
  await copy.props.onClick(); await f.flush()
  assert.match(text(f.tree), /手动复制/)
  nodes(f.tree, node => node.type === 'input' && node.props.type === 'checkbox')[0].props.onChange({ target: { checked: true } })
  await f.flush()
  const done = nodes(f.tree, node => node.props?.className === 'recovery-code__done')[0]
  assert.equal(done.props.disabled, false)
  done.props.onClick(); await f.flush()
  assert.equal(codeCard(f), undefined)
  assert.equal(field('username').props.value, '13800000000')
  assert.equal(byId(f, 'login-password').props.value, '')
  assert.equal(f.storageWrites.length, 0)
  f.unmount()
})
