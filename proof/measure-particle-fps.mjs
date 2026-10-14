// 静止态帧率测量：不截图，每种形态观测 4s 后读引擎指标
const PORT = process.argv[2] || '9229'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
// ⚠️ CDP 里可能有多个 page target（如 about:blank + 我们的页面）。
// 早期版本直接取第一个 type==='page' 的目标，导致偶尔连到 about:blank 上测量，
// 得到「划动障碍=0」的假结论（实际引擎正常）。故按 URL 精确挑选。
const pages = list.filter((t) => t.type === 'page')
const page = pages.find((t) => t.url.includes('localhost:5174')) || pages[0]
if (!page) { console.log('FAILED: 没有可用的 page target'); process.exit(1) }
console.log(`CDP 目标: ${page.url}（共 ${pages.length} 个 page target）\n`)
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
ws.addEventListener('message', (ev) => { const m = JSON.parse(ev.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) } })
const send = (method, params) => new Promise((res, rej) => { const i = ++id; pending.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result))); ws.send(JSON.stringify({ id: i, method, params })) })
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
// ⚠️ 必须解包到 .result.value —— 早期版本写成 (await send(...)).result.value 之外的形状，
// 导致 evalJs 返回的是 CDP 响应对象而非求值结果，读到的引擎指标全是垃圾值
// （曾因此得出「划动障碍=0」的假结论）。
const evalJs = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('EVAL THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result.value
}

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
// 划动时的帧率（最重负载）+ 交互有效性取证
const hero = JSON.parse(await evalJs(`(function(){var r=document.querySelector('.home-hero').getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2})})()`))
await evalJs(`(function(){ var b=document.querySelectorAll('.ink-engine__mode'); for(var i=0;i<b.length;i++) if(b[i].textContent==='烟雨'){b[i].click();return true} return false })()`)
await wait(3000)

// 记录划动过程中的峰值（障碍点/笔触会随时间衰减，必须边划边采，否则读到的是衰减后的 0）
// 注意：整段写成【单行】表达式 —— 跨行模板字符串在多级管道下换行可能被吞，
// 会导致 "Illegal return statement" 或状态未初始化（本脚本踩过两次）。
await evalJs(`(function(){ window.__PEAK__ = { obs: 0, brush: 0, ink: 0, samples: 0 }; var f = function(){ var m = window.__INK_ENGINE_METRICS__ && window.__INK_ENGINE_METRICS__(); if (m) { window.__PEAK__.obs = Math.max(window.__PEAK__.obs, m.obstacles); window.__PEAK__.brush = Math.max(window.__PEAK__.brush, m.brushPoints); window.__PEAK__.ink = Math.max(window.__PEAK__.ink, m.inkParticles); window.__PEAK__.samples++; } window.__PEAK__.raf = requestAnimationFrame(f); }; f(); return true })()`)

await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 90, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
const t0 = Date.now()
let i = 0
while (Date.now() - t0 < 2500) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hero.cx - 90 + Math.sin(i / 6) * 90, y: hero.cy + Math.cos(i / 5) * 20, button: 'left', pointerType: 'mouse' })
  i++
  await wait(25)
}
const ms = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
const peak = JSON.parse(await evalJs(`(function(){ cancelAnimationFrame(window.__PEAK__.raf); return JSON.stringify(window.__PEAK__) })()`))
console.log('─'.repeat(78))
console.log(`划动中（烟雨）  迭代=${i}  峰值: 障碍=${peak.obs} 笔触=${peak.brush} 墨滴=${peak.ink}（采样 ${peak.samples} 帧）`)
console.log(`  划动结束瞬时: 障碍=${ms.obstacles} 笔触=${ms.brushPoints}  帧率=${ms.fps} 帧时均值=${ms.frameMsAvg}ms P95=${ms.frameMsP95}ms`)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
