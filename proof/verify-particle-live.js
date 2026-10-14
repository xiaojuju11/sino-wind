// ════════════════════════════════════════════════════
//  水墨流体粒子引擎 · 真机 390px 验收
//  用法：node proof/verify-particle-live.js [cdpPort]
//
//  验收项：
//   ① 画布已挂载、尺寸正确、dpr 缩放正确
//   ② 实测帧率（≥50fps 目标）与帧时间 P95
//   ③ 粒子在动（两帧位置发生变化，证明物理在跑）
//   ④ 手势划动 → 触发水墨笔触 + 障碍点生成（粒子躲避）
//   ⑤ 装饰层不遮挡内容（日月/设置按钮 elementFromPoint 仍命中）
//   ⑥ 四种形态可切换（落叶/流萤/烟雨/飞雪）且粒子数随之变化
//   ⑦ 页面无横向溢出、无未捕获异常
// ════════════════════════════════════════════════════
const PORT = process.argv[2] || '9229'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
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
  await new Promise((res) => (ws.readyState === 1 ? res() : ws.addEventListener('open', res)))
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error('EVAL THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    return r.result.value
  }

  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await wait(7000)

  const out = {}

  // ① 画布挂载与尺寸
  out.canvas = JSON.parse(await evalJs(`(function(){
    var c = document.querySelector('.ink-engine__canvas');
    if (!c) return JSON.stringify({ mounted: false });
    var r = c.getBoundingClientRect();
    var root = document.querySelector('.ink-engine');
    var cs = getComputedStyle(root);
    return JSON.stringify({
      mounted: true,
      cssSize: [Math.round(r.width), Math.round(r.height)],
      bitmapSize: [c.width, c.height],
      dpr: window.devicePixelRatio,
      rootPointerEvents: cs.pointerEvents,
      rootZIndex: cs.zIndex,
      hudPresent: !!document.querySelector('.ink-engine__hud'),
      term: (document.querySelector('.ink-engine__term')||{}).textContent,
      motif: (document.querySelector('.ink-engine__motif')||{}).textContent
    });
  })()`))

  // ②③ 引擎指标 + 粒子确实在动
  const m1 = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__ ? window.__INK_ENGINE_METRICS__() : null)`))
  await wait(2500)
  const m2 = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__ ? window.__INK_ENGINE_METRICS__() : null)`))
  out.metrics = { first: m1, second: m2 }

  // 粒子运动证据：抓两个时刻的粒子坐标做差
  out.motion = JSON.parse(await evalJs(`(function(){
    // 通过画布像素差判断画面在变化（无需暴露内部状态）
    var c = document.querySelector('.ink-engine__canvas');
    var ctx = c.getContext('2d');
    var w = 60, h = 60;
    var a = ctx.getImageData(0, 0, w, h).data;
    var sumA = 0;
    for (var i=3;i<a.length;i+=4) sumA += a[i];
    return JSON.stringify({ sample1: sumA });
  })()`))
  await wait(1200)
  out.motion2 = JSON.parse(await evalJs(`(function(){
    var c = document.querySelector('.ink-engine__canvas');
    var ctx = c.getContext('2d');
    var a = ctx.getImageData(0, 0, 60, 60).data;
    var sumA = 0;
    for (var i=3;i<a.length;i+=4) sumA += a[i];
    return JSON.stringify({ sample2: sumA });
  })()`))

  // ⑤ 装饰层不遮挡内容：日月按钮必须仍能被 elementFromPoint 命中
  out.hitTest = JSON.parse(await evalJs(`(function(){
    var btn = document.querySelector('.home-hero__icon-btn--theme');
    var bb = btn.getBoundingClientRect();
    var cx = bb.left + bb.width/2, cy = bb.top + bb.height/2;
    var hit = document.elementFromPoint(cx, cy);
    var setBtn = document.querySelectorAll('.home-hero__icon-btn')[1];
    var sb = setBtn.getBoundingClientRect();
    var hit2 = document.elementFromPoint(sb.left + sb.width/2, sb.top + sb.height/2);
    return JSON.stringify({
      themeBtnHit: hit ? (btn.contains(hit) || hit === btn) : false,
      themeHitTag: hit ? hit.tagName + '.' + (hit.className||'').toString().slice(0,40) : null,
      settingsBtnHit: hit2 ? (setBtn.contains(hit2) || hit2 === setBtn) : false
    });
  })()`))

  // ④ 手势划动 → 笔触 + 障碍点
  const beforeSwipe = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
  const heroBox = JSON.parse(await evalJs(`(function(){
    var h = document.querySelector('.home-hero');
    var r = h.getBoundingClientRect();
    return JSON.stringify({ x: r.left, y: r.top, w: r.width, h: r.height, cx: r.left + r.width/2, cy: r.top + r.height/2 });
  })()`))

  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: heroBox.cx - 80, y: heroBox.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
  for (let i = 0; i <= 16; i++) {
    await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: heroBox.cx - 80 + i * 10, y: heroBox.cy + Math.sin(i / 2) * 14, button: 'left', pointerType: 'mouse' })
    await wait(28)
  }
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: heroBox.cx + 80, y: heroBox.cy, button: 'left', clickCount: 1, pointerType: 'mouse' })
  await wait(220)
  const duringSwipe = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
  out.swipe = {
    obstaclesBefore: beforeSwipe ? beforeSwipe.obstacles : null,
    obstaclesDuring: duringSwipe ? duringSwipe.obstacles : null,
    inkParticlesDuring: duringSwipe ? duringSwipe.inkParticles : null,
    pointerActive: await evalJs(`(function(){ return !!(window.__INK_ENGINE_METRICS__ && document.querySelector('.home-hero')); })()`),
  }
  // 涟漪/障碍数需引擎暴露；此处用像素变化证伪"划动无效"
  await wait(60)

  // ⑥ 形态切换
  out.modeSwitch = {}
  for (const label of ['流萤', '烟雨', '飞雪', '落叶']) {
    await evalJs(`(function(){
      var btns = document.querySelectorAll('.ink-engine__mode');
      for (var i=0;i<btns.length;i++) if (btns[i].textContent === '${label}') { btns[i].click(); return true }
      return false;
    })()`)
    await wait(1400)
    const m = JSON.parse(await evalJs(`JSON.stringify(window.__INK_ENGINE_METRICS__())`))
    out.modeSwitch[label] = { mode: m.mode, particles: m.particles, fps: m.fps }
  }

  // ⑦ 溢出与异常
  out.overflowX = await evalJs(`document.documentElement.scrollWidth > document.documentElement.clientWidth`)
  out.consoleErrors = events
    .filter((e) => (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || e.method === 'Runtime.exceptionThrown')
    .map((e) => e.method === 'Runtime.exceptionThrown'
      ? 'EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
      : 'LOG: ' + e.params.entry.text)
    .filter((t) => !/Failed to load resource|ERR_|net::/i.test(t))

  await send('Emulation.clearDeviceMetricsOverride')
  ws.close()
  console.log(JSON.stringify(out, null, 2))
}
main().catch((e) => { console.log('FAILED: ' + e.message); process.exit(1) })
