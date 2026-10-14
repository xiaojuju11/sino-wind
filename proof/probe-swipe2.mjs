// 探针：定位 measure-particle-fps 的划动为何未生效
const PORT = process.argv[2] || '9229'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const pages = list.filter((t) => t.type === 'page')
console.log(`CDP page targets = ${pages.length} → ${pages.map((p) => p.url).join(' | ')}`)
const page = pages[0]
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

// 先点一次「烟雨」按钮（与 measure 脚本相同的步骤）
const clicked = await evalJs(`(function(){
  var b = document.querySelectorAll('.ink-engine__mode');
  for (var i=0;i<b.length;i++) if (b[i].textContent === '烟雨') { b[i].click(); return true }
  return false
})()`)
console.log('mode 烟雨 点击 =', clicked)
await wait(3500)

const hero = JSON.parse(await evalJs(`(function(){
  var r = document.querySelector('.home-hero').getBoundingClientRect();
  return JSON.stringify({ cx: r.left + r.width/2, cy: r.top + r.height/2, top: r.top, h: r.height, w: r.width })
})()`))
console.log('hero 中心 =', JSON.stringify(hero))

// 挂事件探针
await evalJs(`window.__LOG__ = []; (function(){
  var h = document.querySelector('.home-hero');
  ['pointerdown','pointermove','pointerup'].forEach(function(t){
    h.addEventListener(t, function(e){ if(window.__LOG__.length < 12) window.__LOG__.push(t) });
  });
})(); return true`)

// 复刻 measure 的划动方式（正弦往返）
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 90, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
const t0 = Date.now()
let i = 0
while (Date.now() - t0 < 1200) {
  const x = hero.cx - 90 + Math.sin(i / 6) * 90
  const y = hero.cy + Math.cos(i / 5) * 20
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'left', pointerType: 'mouse' })
  i++
  await wait(25)
}
const mid = JSON.parse(await evalJs(`JSON.stringify({ log: window.__LOG__, m: window.__INK_ENGINE_METRICS__() })`))
console.log('迭代次数 =', i)
console.log('题头收到的事件 =', JSON.stringify(mid.log))
console.log('引擎指标 = active:' + mid.m.pointerActive + ' obstacles:' + mid.m.obstacles + ' brush:' + mid.m.brushPoints)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

// 对照：换成 verify 用的线性扫动
await wait(1200)
await evalJs(`window.__LOG2__ = []; (function(){
  var h = document.querySelector('.home-hero');
  ['pointerdown','pointermove'].forEach(function(t){ h.addEventListener(t, function(e){ if(window.__LOG2__.length < 12) window.__LOG2__.push(t) }) });
})(); return true`)
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 80, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
for (let k = 0; k <= 16; k++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hero.cx - 80 + k * 10, y: hero.cy + Math.sin(k / 2) * 14, button: 'left', pointerType: 'mouse' })
  await wait(28)
}
const mid2 = JSON.parse(await evalJs(`JSON.stringify({ log: window.__LOG2__, m: window.__INK_ENGINE_METRICS__() })`))
console.log('\n【线性扫动对照】题头收到的事件 =', JSON.stringify(mid2.log))
console.log('引擎指标 = active:' + mid2.m.pointerActive + ' obstacles:' + mid2.m.obstacles + ' brush:' + mid2.m.brushPoints)
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx + 80, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
