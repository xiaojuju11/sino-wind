// 验收：① 登录态持久化（再次打开免密入席）② 边缘左右滑动 = 返回上一级而非退出站点。
//
// 运行：node proof/verify-auth-and-swipe.mjs
// 依赖：本机 Chrome（或设 CHROME_PATH）、已构建的 frontend/dist（npm run build）
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(HERE, '../frontend/dist')
const PORT = 5181
const DEBUG_PORT = 9223
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const VIEW = { width: 390, height: 844 }
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.json': 'application/json', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' }

const results = []
const check = (label, ok, detail) => {
  results.push({ label, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' :: ' + detail : ''}`)
}

const server = http.createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://127.0.0.1')
  let file = path.join(DIST, decodeURIComponent(pathname))
  const stat = await fs.stat(file).catch(() => null)
  if (!stat || stat.isDirectory()) file = path.join(DIST, 'index.html')
  try {
    const body = await fs.readFile(file)
    res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('not found')
  }
})
await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve))

const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'gf-auth-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu',
  '--disable-background-networking', '--disable-sync', '--mute-audio',
  `--window-size=${VIEW.width},${VIEW.height}`, 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const httpJson = async (pathname) => (await fetch(`http://127.0.0.1:${DEBUG_PORT}${pathname}`)).json()

async function waitForChrome() {
  for (let i = 0; i < 100; i++) {
    try {
      const info = await httpJson('/json/version')
      if (info.webSocketDebuggerUrl) return info
    } catch { /* 还没起来 */ }
    await sleep(150)
  }
  throw new Error('Chrome 调试端口未就绪')
}

async function connect(url) {
  const ws = new WebSocket(url)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  let seq = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data)
    const entry = pending.get(message.id)
    if (!entry) return
    pending.delete(message.id)
    if (message.error) entry.reject(new Error(JSON.stringify(message.error)))
    else entry.resolve(message.result)
  })
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
  return { ws, send }
}

const b64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url')
const makeToken = (expSeconds) => `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ id: 1, phone: '13800001111', authVersion: 0, exp: expSeconds })}.sig`

try {
  const version = await waitForChrome()
  const targets = await httpJson('/json/list')
  const page = targets.find((t) => t.type === 'page')
  const cdp = await connect(page.webSocketDebuggerUrl)
  const browser = await connect(version.webSocketDebuggerUrl)
  const { send } = cdp

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: 2, mobile: true })
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 })

  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (exceptionDetails) throw new Error(exceptionDetails.text || 'evaluate failed')
    return result.value
  }
  const waitFor = async (expression, timeout = 15000) => {
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
      if (await evaluate(expression).catch(() => false)) return true
      await sleep(120)
    }
    return false
  }
  const shoot = async (name) => {
    const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
    await fs.writeFile(path.join(HERE, `mobile-${name}.png`), Buffer.from(data, 'base64'))
    console.log(`SHOT proof/mobile-${name}.png`)
  }

  let seedScriptId = null
  const seedStorage = async (entries) => {
    if (seedScriptId) { await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: seedScriptId }); seedScriptId = null }
    const source = Object.entries(entries).map(([key, value]) => `localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(value)})`).join(';')
    const result = await send('Page.addScriptToEvaluateOnNewDocument', { source: source || 'void 0' })
    seedScriptId = result.identifier
  }
  const goto = async (url) => {
    await send('Page.navigate', { url: `http://127.0.0.1:${PORT}${url}` })
    await sleep(700)
  }
  const swipe = async (fromX, toX, y) => {
    const steps = 8
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: fromX, y, id: 1 }] })
    for (let i = 1; i <= steps; i++) {
      await send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: Math.round(fromX + (toX - fromX) * i / steps), y, id: 1 }] })
      await sleep(12)
    }
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  }
  const state = () => evaluate('({ path: location.pathname, idx: history.state && history.state.idx, hasLogin: Boolean(document.querySelector(".auth-login")), hasHome: Boolean(document.querySelector(".home-root")), hasPoem: Boolean(document.querySelector(".poem-root")), token: localStorage.getItem("token") })')

  const nowSeconds = Math.floor(Date.now() / 1000)

  // ── ① 有效会话：再次打开 /login 直接入席 ──────────────────────────
  await seedStorage({ token: makeToken(nowSeconds + 6 * 86400), gufeng_last_account: '13800001111' })
  await goto('/login')
  const autoEntered = await waitFor("Boolean(document.querySelector('.home-root'))")
  const afterAuto = await state()
  check('有效会话打开 /login：免密直接进入首页', autoEntered && afterAuto.path === '/home' && !afterAuto.hasLogin, JSON.stringify(afterAuto))
  await shoot('1-auto-login-home')

  // ── ② 过期会话：回到登录页、清掉废 token、预填上次账号 ─────────────
  await seedStorage({ token: makeToken(nowSeconds - 3600), gufeng_last_account: '13800001111' })
  await goto('/login')
  const loginShown = await waitFor("Boolean(document.querySelector('.auth-login'))")
  const loginPhone = await evaluate("document.querySelector('.auth-login input[name=username]')?.value || ''")
  const afterExpired = await state()
  check('过期会话：停在登录页而不是闪进首页', loginShown && afterExpired.path === '/login', JSON.stringify(afterExpired))
  check('过期 token 已被清掉，不会反复触发 416', afterExpired.token === null, String(afterExpired.token))
  check('上次入席账号已预填，只需补密押', loginPhone === '13800001111', loginPhone)
  await shoot('2-expired-relogin')

  // ── ③ 有站内历史：/poem 边缘右滑回到 /home ─────────────────────────
  await seedStorage({ token: makeToken(nowSeconds + 6 * 86400) })
  await goto('/home')
  await waitFor("Boolean(document.querySelector('.home-poem-card'))")
  await evaluate("document.querySelector('.home-poem-card').click()")
  const reachedPoem = await waitFor("location.pathname === '/poem' && Boolean(document.querySelector('.poem-root'))")
  const onPoem = await state()
  check('从首页进入诗词页（站内历史 +1）', reachedPoem && onPoem.idx === 1, JSON.stringify(onPoem))

  await swipe(6, 150, 430)
  const backHome = await waitFor("location.pathname === '/home'")
  const afterSwipe = await state()
  check('左边缘向右滑：回到上一级 /home', backHome && afterSwipe.path === '/home', JSON.stringify(afterSwipe))
  await shoot('3-swipe-back-home')

  // ── ④ 直接打开二级页（无站内历史）：滑动退到它的上级 ───────────────
  await goto('/poem')
  await waitFor("Boolean(document.querySelector('.poem-root'))")
  const directPoem = await state()
  check('直接打开 /poem：历史序号为 0（真实场景里一划就会退出站点）', directPoem.idx === 0, JSON.stringify(directPoem))
  await swipe(384, 250, 430)
  const fallbackHome = await waitFor("location.pathname === '/home'")
  check('无历史时右边缘向左滑：退到 /home 而不是退出项目', fallbackHome, JSON.stringify(await state()))

  // ── ⑤ 首页左右滑：不退出、停在本页 ────────────────────────────────
  const homeBefore = await state()
  await swipe(6, 160, 430)
  await sleep(600)
  const afterLeft = await state()
  await swipe(384, 240, 430)
  await sleep(600)
  const afterRight = await state()
  check('首页左边缘右滑：留在 /home，不再退出项目', afterLeft.path === '/home' && afterLeft.hasHome, JSON.stringify(afterLeft))
  check('首页右边缘左滑：留在 /home，不再退出项目', afterRight.path === '/home' && afterRight.hasHome, JSON.stringify(afterRight))

  // ── ⑥ 正文中部横滑：不误触发返回（横向滚动仍归页面） ────────────────
  await evaluate("history.pushState({}, '', '/home')")
  await swipe(150, 330, 500)
  await sleep(500)
  const centerSwipe = await state()
  check('正文中部横滑不触发返回', centerSwipe.path === '/home', JSON.stringify(centerSwipe))
  console.log('evidence :: homeBefore=' + JSON.stringify(homeBefore))

  await browser.send('Browser.close').catch(() => {})
  cdp.ws.close()
  browser.ws.close()
} finally {
  chrome.kill()
  server.close()
  await fs.rm(profile, { recursive: true, force: true }).catch(() => {})
}

const failed = results.filter((r) => !r.ok)
console.log(`\n${results.length - failed.length}/${results.length} checks passed`)
if (failed.length) process.exitCode = 1
