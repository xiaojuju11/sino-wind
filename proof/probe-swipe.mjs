// 探针：划动为何不触发（逐项检查监听挂载、坐标、事件流）
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

// ① 题头是否存在 is-ink-zone、位置与尺寸
console.log('① 题头元素')
console.log(await evalJs(`(function(){
  var h = document.querySelector('.home-hero');
  if (!h) return 'home-hero 不存在';
  var r = h.getBoundingClientRect();
  return JSON.stringify({ cls: h.className, rect: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] });
})()`))

// ② 在页面内直接派发 pointerdown，看引擎是否响应（绕过 CDP 输入）
console.log('\n② 页面内合成 PointerEvent（绕开 CDP 输入层）')
console.log(await evalJs(`(function(){
  var h = document.querySelector('.home-hero');
  var r = h.getBoundingClientRect();
  var x = r.left + r.width/2, y = r.top + r.height/2;
  h.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: x, clientY: y, pointerId: 1, pointerType: 'touch' }));
  var m1 = window.__INK_ENGINE_METRICS__();
  for (var i=1;i<=8;i++) {
    h.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: x + i*6, clientY: y + i*2, pointerId: 1, pointerType: 'touch' }));
  }
  var m2 = window.__INK_ENGINE_METRICS__();
  h.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, clientX: x+48, clientY: y+16, pointerId: 1, pointerType: 'touch' }));
  return JSON.stringify({ afterDown: { active: m1.pointerActive, obs: m1.obstacles, brush: m1.brushPoints }, afterMove: { active: m2.pointerActive, obs: m2.obstacles, brush: m2.brushPoints, ink: m2.inkParticles } });
})()`))

// ③ CDP 真实鼠标事件：观察它到底落在哪个元素上
console.log('\n③ CDP 鼠标事件落点')
const hero = JSON.parse(await evalJs(`(function(){var r=document.querySelector('.home-hero').getBoundingClientRect();return JSON.stringify({cx:r.left+r.width/2,cy:r.top+r.height/2})})()`))
console.log('   目标坐标 = ' + JSON.stringify(hero))
console.log('   elementFromPoint = ' + await evalJs(`(function(){
  var el = document.elementFromPoint(${hero.cx}, ${hero.cy});
  return el ? (el.tagName + ' | class=' + (el.className||'').toString() + ' | pe=' + getComputedStyle(el).pointerEvents) : 'null';
})()`))

await evalJs(`window.__SWIPE_LOG__ = []; (function(){
  var h = document.querySelector('.home-hero');
  ['pointerdown','pointermove','pointerup'].forEach(function(t){
    h.addEventListener(t, function(e){ window.__SWIPE_LOG__.push(t + '@' + Math.round(e.clientX) + ',' + Math.round(e.clientY)); });
  });
})(); return true`)

await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: hero.cx - 60, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
for (let i = 0; i < 6; i++) {
  await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: hero.cx - 60 + i * 12, y: hero.cy, button: 'left', pointerType: 'mouse' })
  await wait(30)
}
const ms = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
console.log('   题头收到的事件 = ' + await evalJs(`JSON.stringify(window.__SWIPE_LOG__)`))
console.log('   引擎指标 = ' + JSON.stringify({ active: ms.pointerActive, obs: ms.obstacles, brush: ms.brushPoints }))
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: hero.cx + 12, y: hero.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
