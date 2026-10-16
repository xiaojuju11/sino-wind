// 重新生成交付文档所需的预览截图（存回 proof/，作为仓库证据）
import fs from 'node:fs'
const PROOF = 'D:/sino-wind-taskB/proof/'

const nt = await (await fetch('http://127.0.0.1:9230/json/new?about:blank', { method: 'PUT' })).json()
const TARGET = nt.id
const ws = new WebSocket(nt.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result))); ws.send(JSON.stringify({ id: i, method: me, params: p })) })
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
const ev = async (e, ms = 25000) => {
  const r = await Promise.race([send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]).catch((err) => ({ result: { value: 'ERR ' + err.message } }))
  return r.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await send('Page.enable'); await send('Runtime.enable')
// 用较高视口，使卡片完整落在一屏内（便于截图不裁切）
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 1000, deviceScaleFactor: 3, mobile: true })

// ① 首页时令区块
await send('Page.navigate', { url: 'http://localhost:5180/home' })
await wait(16000)
await ev(`(() => { const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); return true })()`)
await wait(700)
let r = JSON.parse(await ev(`(() => { const c=document.querySelector('.home-almanac').getBoundingClientRect(); return JSON.stringify({t:Math.round(c.top),l:Math.round(c.left),w:Math.round(c.width),h:Math.round(c.height)}) })()`))
if (r.t >= 0 && r.t + r.h <= 1000) {
  let s = await send('Page.captureScreenshot', { format: 'png', clip: { x: r.l - 6, y: r.t - 6, width: r.w + 12, height: r.h + 12, scale: 3 } })
  fs.writeFileSync(PROOF + 'preview-almanac.png', Buffer.from(s.data, 'base64'))
  console.log('  ✅ preview-almanac.png  ' + (r.w + 12) + 'x' + (r.h + 12))
} else console.log('  ⚠️ 时令区块未完整在视口内: top=' + r.t + ' bottom=' + (r.t + r.h))

// ② 城邑志二级页（截上中部，含页头与沿革轴）
await send('Page.navigate', { url: 'http://localhost:5180/city-chronicle' })
await wait(14000)
await ev(`(() => { const i=document.querySelector('.chronicle-search input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'西安'); i.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
await wait(1400)
r = JSON.parse(await ev(`(() => { const c=document.querySelector('.chronicle-card').getBoundingClientRect(); return JSON.stringify({t:Math.round(c.top),l:Math.round(c.left),w:Math.round(c.width),h:Math.round(c.height)}) })()`))
{
  // 取卡片区域（含页头一点上下文），高度上限 700 以保证比例适中
  const top = Math.max(0, r.t - 96)
  const h = Math.min(r.h + 106, 1000 - top)
  let s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: top, width: 390, height: h, scale: 3 } })
  fs.writeFileSync(PROOF + 'preview-chronicle.png', Buffer.from(s.data, 'base64'))
  console.log('  ✅ preview-chronicle.png  390x' + h)
}

// ③ 拍照识器采集页（按钮规范）
await send('Page.navigate', { url: 'http://localhost:5180/recognition' })
await wait(14000)
r = JSON.parse(await ev(`(() => { const h=document.querySelector('.image-capture-header').getBoundingClientRect(); const b=document.querySelector('.image-capture-btn--primary').getBoundingClientRect(); return JSON.stringify({t:Math.round(h.top),b:Math.round(b.bottom),l:Math.round(h.left),w:Math.round(h.width)}) })()`))
{
  const top = Math.max(0, r.t - 8)
  const h = Math.min(r.b - r.t + 20, 1000 - top)
  let s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: top, width: 390, height: h, scale: 3 } })
  fs.writeFileSync(PROOF + 'preview-recognition.png', Buffer.from(s.data, 'base64'))
  console.log('  ✅ preview-recognition.png  390x' + h)
}
await fetch(`http://127.0.0.1:9230/json/close/${TARGET}`).catch(() => {})
ws.close()
process.exit(0)
