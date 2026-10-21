// 验收：软键盘弹起时底部 Tab 是否被键盘「顶起来」并遮住正文。
// 用 CDP 把布局视口从 844 压到 524，等价于 Android WebView 弹起 320px 键盘，
// 分别截取「收起态 / 键盘弹起（修复后）/ 键盘弹起（修复前对照）/ 落键盘恢复」四张图。
//
// 运行：node proof/verify-keyboard-nav.mjs
// 依赖：本机 Chrome（或设 CHROME_PATH）、已构建的 frontend/dist（npm run build）
import http from 'node:http'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const DIST = path.resolve(HERE, '../frontend/dist')
const PORT = 5180
const DEBUG_PORT = 9222
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const VIEW = { width: 390, height: 844 }
const KEYBOARD = 320
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

const profile = await fs.mkdtemp(path.join(os.tmpdir(), 'gf-keyboard-'))
const chrome = spawn(CHROME, [
  '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-gpu',
  '--disable-background-networking', '--disable-sync', '--mute-audio',
  `--window-size=${VIEW.width},${VIEW.height}`, 'about:blank',
], { stdio: 'ignore' })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const httpJson = async (pathname, method = 'GET') => (await fetch(`http://127.0.0.1:${DEBUG_PORT}${pathname}`, { method })).json()

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

const shoot = async (send, name) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png', fromSurface: true })
  const file = path.join(HERE, `keyboard-nav-${name}.png`)
  await fs.writeFile(file, Buffer.from(data, 'base64'))
  console.log(`SHOT ${path.relative(DIST, file)}`)
}

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
  await send('Page.addScriptToEvaluateOnNewDocument', { source: "localStorage.setItem('token', 'verify-keyboard-nav')" })

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
  const navState = () => evaluate(`(() => {
    const nav = document.querySelector('.bottom-nav')
    const style = getComputedStyle(nav)
    const rect = nav.getBoundingClientRect()
    return {
      htmlClass: document.documentElement.className,
      opacity: Number(style.opacity),
      transform: style.transform,
      top: Math.round(rect.top),
      bottom: Math.round(rect.bottom),
      viewportHeight: window.innerHeight,
      inert: nav.hasAttribute('inert'),
      ariaHidden: nav.getAttribute('aria-hidden'),
    }
  })()`)

  await send('Page.navigate', { url: `http://127.0.0.1:${PORT}/home` })
  check('首页与底部 Tab 渲染完成', await waitFor("Boolean(document.querySelector('.bottom-nav .bottom-nav__label'))"), '')
  await sleep(900)

  const closed = await navState()
  await shoot(send, '1-keyboard-closed')
  check('未弹键盘：底栏常驻可见', closed.opacity === 1 && closed.htmlClass === '' && closed.bottom <= closed.viewportHeight, JSON.stringify(closed))

  // 聚焦雅译输入框，再把布局视口压缩 320px —— 等价 Android/微信弹起软键盘
  await evaluate("document.querySelector('.home-yayan-textarea').focus()")
  await send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height - KEYBOARD, deviceScaleFactor: 2, mobile: true })
  await sleep(700)
  const open = await navState()
  await shoot(send, '2-keyboard-open-fixed')
  check('键盘弹起：<html> 标记 is-keyboard-open', /is-keyboard-open/.test(open.htmlClass), open.htmlClass)
  check('键盘弹起：底栏淡出且不可点击', open.opacity === 0 && open.inert === true, `opacity=${open.opacity} inert=${open.inert}`)
  check('键盘弹起：底栏已移出可视区（不再浮在键盘上方遮正文）', open.top >= open.viewportHeight - 4, `top=${open.top} viewport=${open.viewportHeight}`)

  // 对照：强制还原旧样式，复现「底栏被顶到键盘上方」的原缺陷
  await evaluate(`(() => {
    const style = document.createElement('style')
    style.id = 'legacy-nav'
    style.textContent = '.bottom-nav { opacity: 1 !important; transform: translateX(-50%) !important; pointer-events: auto !important; }'
    document.head.appendChild(style)
    return true
  })()`)
  await sleep(350)
  const legacy = await navState()
  await shoot(send, '3-keyboard-open-before-fix')
  check('对照：旧样式下底栏确实悬在键盘上方（缺陷复现）', legacy.opacity === 1 && legacy.bottom <= legacy.viewportHeight + 4, `top=${legacy.top} bottom=${legacy.bottom} viewport=${legacy.viewportHeight}`)

  // 落键盘：移除对照样式、复原视口、失焦
  await evaluate("document.getElementById('legacy-nav').remove()")
  await evaluate('document.activeElement.blur()')
  await send('Emulation.setDeviceMetricsOverride', { width: VIEW.width, height: VIEW.height, deviceScaleFactor: 2, mobile: true })
  await sleep(700)
  const restored = await navState()
  await shoot(send, '4-keyboard-closed-again')
  check('落键盘：底栏自动复原', restored.opacity === 1 && restored.htmlClass === '' && restored.inert === false, JSON.stringify(restored))

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
