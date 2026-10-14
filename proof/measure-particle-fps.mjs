// 静止态帧率测量：不截图，每种形态观测 4s 后读引擎指标
const PORT = process.argv[2] || '9229'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result))); ws.send(JSON.stringify({ id: i, method, params })) })
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
const evalJs = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result.value

await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Page.navigate', { url: 'http://localhost:5174/' })
await wait(7000)

console.log('形态      模式        粒子  涟漪  质量   帧率     帧时均值   P95     最差')
console.log('─'.repeat(78))
for (const label of ['落叶', '流萤', '烟雨', '飞雪']) {
  await evalJs(`(function(){ var b=document.querySelectorAll('.ink-engine__mode'); for(var i=0;i<b.length;i++) if(b[i].textContent==='${label}'){b[i].click();return true} return false })()`)
  await wait(4500) // 静止观测，不含任何截图干扰
  const m = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
  const pad = (s, n) => String(s).padEnd(n)
  console.log(
    `${pad(label, 9)}${pad(m.mode, 11)}${pad(m.particles, 6)}${pad(m.ripples, 6)}${pad(m.qualityScale, 7)}${pad(m.fps, 9)}${pad(m.frameMsAvg, 11)}${pad(m.frameMsP95, 9)}${m.frameMsWorst}`,
  )
}
// 划动时的帧率（最重负载）
const hero = JSON.parse(await evalJs(`(function(){var r=document.querySelector('.home-hero').getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2})})()`))
await evalJs(`(function(){ var b=document.querySelectorAll('.ink-engine__mode'); for(var i=0;i<b.length;i++) if(b[i].textContent==='烟雨'){b[i].click();return true} return false })()`)
await wait(3000)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 90, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
const t0 = Date.now()
let i = 0
while (Date.now() - t0 < 2500) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hero.cx - 90 + Math.sin(i / 6) * 90, y: hero.cy + Math.cos(i / 5) * 20, button: 'left', pointerType: 'mouse' })
  i++
  await wait(25)
}
const ms = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
console.log('─'.repeat(78))
console.log(`划动中（烟雨）  障碍=${ms.obstacles} 笔触点=${ms.brushPoints} 墨滴=${ms.inkParticles}  帧率=${ms.fps}  帧时均值=${ms.frameMsAvg}ms  P95=${ms.frameMsP95}ms`)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
