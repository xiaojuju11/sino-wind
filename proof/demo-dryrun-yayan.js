// 演示彩排：390px 真机视口下走完整「白话雅译」链路（输入 → 点按钮 → 等真实 AI → 校验 DOM）
const PORT = process.argv[2] || '9229'
import fs from 'node:fs'
import path from 'node:path'
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
  await wait(6000)

  const out = {}
  out.beforeClick = JSON.parse(await evalJs(`(function(){
    var a = document.querySelector('.home-yayan-ancient-text');
    return JSON.stringify({ ancientShown: a ? a.textContent.trim() : null,
                            offlineBadge: document.querySelectorAll('.home-yayan-offline').length });
  })()`))

  // 输入白话
  await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '今天心情特别好想出去走走');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  await wait(400)

  // 点「译为雅言」
  const t0 = Date.now()
  await evalJs(`(function(){ document.querySelector('.home-yayan-submit-btn').click(); return true; })()`)

  // 轮询：等译文出现且不再是首屏预置内容
  let settled = null
  for (let i = 0; i < 40; i++) {
    await wait(500)
    settled = JSON.parse(await evalJs(`(function(){
      var a = document.querySelector('.home-yayan-ancient-text');
      var btn = document.querySelector('.home-yayan-submit-btn');
      return JSON.stringify({
        ancient: a ? a.textContent.replace('闲','').trim() : null,
        btnLabel: btn ? btn.textContent.trim() : null,
        translating: btn ? btn.textContent.indexOf('研墨') !== -1 : null
      });
    })()`))
    if (settled.btnLabel === '译为雅言' && settled.ancient && settled.ancient.indexOf('偷得浮生半日闲') === -1) break
    if (settled.btnLabel === '译为雅言' && i > 6) break
  }
  out.elapsedMs = Date.now() - t0

  out.afterClick = JSON.parse(await evalJs(`(function(){
    var card = document.querySelector('.home-yayan-result-card');
    var ancient = document.querySelector('.home-yayan-ancient-text');
    var author = document.querySelector('.home-yayan-author');
    var explain = document.querySelector('.home-yayan-explain');
    var seal = document.querySelector('.home-yayan-seal');
    var cr = card ? card.getBoundingClientRect() : null;
    var ar = ancient ? ancient.getBoundingClientRect() : null;
    return JSON.stringify({
      resultCardPresent: !!card,
      ancientText: ancient ? ancient.textContent.trim() : null,
      authorText: author ? author.textContent.trim() : null,
      explainText: explain ? explain.textContent.trim() : null,
      sealVisible: seal ? (seal.getBoundingClientRect().width > 0) : false,
      textInsideCard: (ar && cr) ? (ar.left >= cr.left - 0.5 && ar.right <= cr.right + 0.5) : null,
      offlineBadgeCount: document.querySelectorAll('.home-yayan-offline').length,
      collectDisabled: document.querySelector('.home-yayan-collect-btn').disabled,
      ancientLines: ar ? Math.round(ar.height / parseFloat(getComputedStyle(ancient).lineHeight)) : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`))

  // 顺带验证「摘录入卷」写库
  out.collect = JSON.parse(await evalJs(`(function(){
    document.querySelector('.home-yayan-collect-btn').click();
    return true;
  })()`))
  await wait(800)
  out.storage = JSON.parse(await evalJs(`(function(){
    var l = JSON.parse(localStorage.getItem('gufeng_yayan_list') || '[]');
    return JSON.stringify({ count: l.length, first: l[0] || null });
  })()`))

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  const outDir = 'D:\\sino-wind-taskB\\proof'
  fs.writeFileSync(path.join(outDir, 'phase3-home-real-ai-390.png'), Buffer.from(shot.data, 'base64'))

  out.consoleErrors = events
    .filter((e) => (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') || e.method === 'Runtime.exceptionThrown')
    .map((e) => e.method === 'Runtime.exceptionThrown'
      ? 'EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
      : 'LOG: ' + e.params.entry.text)

  await send('Emulation.clearDeviceMetricsOverride')
  ws.close()
  console.log(JSON.stringify(out, null, 2))
}
main().catch((e) => { console.log('FAILED: ' + e.message); process.exit(1) })
