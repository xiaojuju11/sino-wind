// 诗词页格律模块 · 390px 真机验收
const PORT = process.argv[2] || '9229'
import fs from 'node:fs'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
const page = list.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
let id = 0
const pending = new Map()
const events = []
ws.addEventListener('message', (ev) => {
  const m = JSON.parse(ev.data)
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
  else if (m.method) events.push(m)
})
const send = (method, params) => new Promise((res, rej) => {
  const i = ++id
  pending.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)))
  ws.send(JSON.stringify({ id: i, method, params }))
})
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
const evalJs = async (e) => {
  const r = await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) throw new Error('THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
  return r.result.value
}

await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

// 先取一首固定诗（避免随机）
await send('Page.navigate', { url: 'http://localhost:5174/poem' })
await wait(8000)

const out = {}

// ① 模块挂载
out.mounted = JSON.parse(await evalJs(`(function(){
  var s = document.querySelector('.poem-metre');
  if (!s) return JSON.stringify({ present: false });
  return JSON.stringify({
    present: true,
    title: (document.querySelector('.poem-metre__title')||{}).textContent,
    form: (document.querySelector('.poem-metre__form')||{}).textContent,
    radarSvg: document.querySelectorAll('.radar-chart__svg').length,
    rings: document.querySelectorAll('.radar-chart__ring').length,
    spokes: document.querySelectorAll('.radar-chart__spoke').length,
    shapePoints: (document.querySelector('.radar-chart__shape')||{}).getAttribute ? document.querySelector('.radar-chart__shape').getAttribute('points') : null,
    labels: [].map.call(document.querySelectorAll('.radar-chart__label'), function(e){ return e.textContent }),
    values: [].map.call(document.querySelectorAll('.radar-chart__value'), function(e){ return e.textContent }),
    dimRows: document.querySelectorAll('.poem-metre__dim').length,
    toneChars: document.querySelectorAll('.tone-pattern__char').length,
    toneLines: document.querySelectorAll('.tone-pattern__line').length,
    summary: (document.querySelector('.tone-pattern__summary')||{}).textContent,
    rhymeTags: document.querySelectorAll('.tone-pattern__rhyme-tag').length,
    fallbackChars: document.querySelectorAll('.tone-pattern__char.is-fallback').length,
    unknownChars: document.querySelectorAll('.tone-pattern__char.is-unknown').length
  });
})()`))

// ② 几何自检：顶点数 = 5，且都在 SVG 视口内
out.geometry = JSON.parse(await evalJs(`(function(){
  var poly = document.querySelector('.radar-chart__shape');
  if (!poly) return JSON.stringify({ ok: false });
  var pts = poly.getAttribute('points').trim().split(/\\s+/).map(function(p){ var a = p.split(','); return { x: parseFloat(a[0]), y: parseFloat(a[1]) } });
  var vb = document.querySelector('.radar-chart__svg').getAttribute('viewBox').split(' ').map(Number);
  var inside = pts.every(function(p){ return p.x >= 0 && p.x <= vb[2] && p.y >= 0 && p.y <= vb[3] });
  // 面积（鞋带）
  var area = 0;
  for (var i=0;i<pts.length;i++){ var a=pts[i], b=pts[(i+1)%pts.length]; area += a.x*b.y - b.x*a.y }
  area = Math.abs(area)/2;
  return JSON.stringify({ vertexCount: pts.length, allInsideViewBox: inside, area: Math.round(area), viewBox: vb });
})()`))

// ③ 弹性形变：抓取切换前的顶点，点「换一首」后连续采样，验证顶点在【变化中】且【逐帧过渡】
const before = await evalJs(`document.querySelector('.radar-chart__shape').getAttribute('points')`)
await evalJs(`(function(){ var b=[].find.call(document.querySelectorAll('.poem-action'), function(e){ return e.textContent.indexOf('换一首')!==-1 }); if(b) b.click(); return !!b })()`)
const samples = []
for (let i = 0; i < 10; i++) {
  await wait(90)
  const p = await evalJs(`(function(){ var e=document.querySelector('.radar-chart__shape'); return e? e.getAttribute('points') : null })()`)
  samples.push(p)
}
await wait(1500)
const after = await evalJs(`document.querySelector('.radar-chart__shape').getAttribute('points')`)
const distinct = new Set(samples.filter(Boolean)).size
out.elastic = {
  distinctFramesDuringTransition: distinct,
  changedAfterSwitch: before !== after,
  sample0: samples[0],
  sampleMid: samples[4],
  sampleEnd: samples[9],
  note: distinct >= 3 ? '过渡期间顶点逐帧变化 → 存在形变动画' : '未观测到过渡帧',
}

out.afterSwitch = JSON.parse(await evalJs(`(function(){
  return JSON.stringify({
    form: (document.querySelector('.poem-metre__form')||{}).textContent,
    values: [].map.call(document.querySelectorAll('.radar-chart__value'), function(e){ return e.textContent }),
    scores: [].map.call(document.querySelectorAll('.poem-metre__dim-score'), function(e){ return e.textContent }),
    toneChars: document.querySelectorAll('.tone-pattern__char').length,
    summary: (document.querySelector('.tone-pattern__summary')||{}).textContent
  });
})()`))

// ④ 点击单字 → 判定依据浮层
out.charDetail = JSON.parse(await evalJs(`(function(){
  var c = document.querySelectorAll('.tone-pattern__char')[3];
  if (!c) return JSON.stringify({ ok:false });
  c.click();
  return JSON.stringify({ ok: true });
})()`))
await wait(400)
out.charDetailPanel = JSON.parse(await evalJs(`(function(){
  var d = document.querySelector('.tone-pattern__detail');
  return JSON.stringify({ present: !!d, text: d ? d.textContent : null });
})()`))

// ⑤ 暗色模式
await evalJs(`localStorage.setItem('gufeng_theme','dark')`)
await send('Page.navigate', { url: 'http://localhost:5174/poem' })
await wait(7000)
out.dark = JSON.parse(await evalJs(`(function(){
  var s = document.querySelector('.radar-chart__shape');
  var ring = document.querySelector('.radar-chart__ring');
  return JSON.stringify({
    theme: document.documentElement.getAttribute('data-theme'),
    shapeStroke: s ? getComputedStyle(s).stroke : null,
    ringStroke: ring ? getComputedStyle(ring).stroke : null,
    metrePresent: !!document.querySelector('.poem-metre'),
    overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
  });
})()`))

// ⑥ 溢出与报错（两种主题都查）
out.lightOverflow = await evalJs(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
out.consoleErrors = events
  .filter((e) => (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || e.method === 'Runtime.exceptionThrown')
  .map((e) => e.method === 'Runtime.exceptionThrown'
    ? 'EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
    : 'LOG: ' + e.params.entry.text)
  .filter((t) => !/Failed to load resource|ERR_|net::|500/i.test(t))

const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
fs.writeFileSync('D:/sino-wind-taskB/proof/poem-metre-dark-390.png', Buffer.from(shot.data, 'base64'))
await evalJs(`localStorage.setItem('gufeng_theme','light')`)
await send('Page.navigate', { url: 'http://localhost:5174/poem' })
await wait(7000)
const shot2 = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
fs.writeFileSync('D:/sino-wind-taskB/proof/poem-metre-light-390.png', Buffer.from(shot2.data, 'base64'))

await send('Emulation.clearDeviceMetricsOverride')
ws.close()
console.log(JSON.stringify(out, null, 2))
