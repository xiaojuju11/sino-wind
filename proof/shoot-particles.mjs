// 粒子引擎形态截图（雨/萤/雪/叶）
const PORT = process.argv[2] || '9229'
import fs from 'node:fs'
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

const outDir = 'D:\\sino-wind-taskB\\proof'
const shots = [
  ['烟雨', 'particle-rain-390.png', 3500],
  ['流萤', 'particle-firefly-390.png', 2500],
  ['飞雪', 'particle-snow-390.png', 3000],
]

for (const [label, file, dwell] of shots) {
  await evalJs(`(function(){ var b=document.querySelectorAll('.ink-engine__mode'); for(var i=0;i<b.length;i++) if(b[i].textContent==='${label}'){b[i].click();return true} return false })()`)
  await wait(dwell)
  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  fs.writeFileSync(`${outDir}\\${file}`, Buffer.from(shot.data, 'base64'))
  const m = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
  console.log(`${label} → ${file}  mode=${m.mode} particles=${m.particles} ripples=${m.ripples} fps=${m.fps}`)
}

// 划动交互截图：按住拖动
const hero = JSON.parse(await evalJs(`(function(){var r=document.querySelector('.home-hero').getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2})})()`))
await evalJs(`(function(){ var b=document.querySelectorAll('.ink-engine__mode'); for(var i=0;i<b.length;i++) if(b[i].textContent==='落叶'){b[i].click();return true} return false })()`)
await wait(1200)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 90, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
for (let i = 0; i <= 20; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hero.cx - 90 + i * 9, y: hero.cy + Math.sin(i / 2.2) * 16, button: 'left', pointerType: 'mouse' })
  await wait(30)
}
const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
fs.writeFileSync(`${outDir}\\particle-swipe-390.png`, Buffer.from(shot2.data, 'base64'))
const ms = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
console.log(`划动中 → particle-swipe-390.png  obstacles=${ms.obstacles} brush=${ms.brushPoints} ink=${ms.inkParticles}`)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx + 90, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
