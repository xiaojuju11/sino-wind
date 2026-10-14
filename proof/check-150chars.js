// 150 字极端输入下的排版防御实测（对照 AC-B2）
const PORT = process.argv[2] || '9229'
import fs from 'node:fs'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  // ⚠️ 必须按 URL 选目标：CDP 里常同时存在 about:blank 与我们的页面，
  // 取第一个 type==='page' 会偶尔连错目标，得到「输入框未变化」之类的假结论。
  const pages = list.filter((t) => t.type === 'page')
  const page = pages.find((t) => t.url.includes('localhost:5174')) || pages[0]
  if (!page) { console.log('FAILED: 没有可用的 page target'); process.exit(1) }
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id) }
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

  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await wait(7000)

  const report = {}
  report.limit = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    return JSON.stringify({ maxLength: ta.getAttribute('maxlength'), placeholder: ta.getAttribute('placeholder') });
  })()`))

  // 注入满 150 字
  report.inject = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var base = '今天心情特别好想出去走走看看春天的花开顺便去湖边吹吹风听听鸟叫';
    var t = base; while (t.length < 150) t += base; t = t.slice(0, 150);
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, t);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.stringify({ len: ta.value.length });
  })()`))
  await wait(600)

  report.layout = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var box = document.querySelector('.home-yayan-input-box');
    var counter = document.querySelector('.home-yayan-counter');
    var card = document.querySelector('.home-yayan-result-card');
    var cs = getComputedStyle(ta);
    var taR = ta.getBoundingClientRect();
    var boxR = box.getBoundingClientRect();
    return JSON.stringify({
      counterText: counter.textContent,
      counterLimitClass: counter.className.indexOf('is-limit') !== -1,
      counterColor: getComputedStyle(counter).color,
      taHeight: Math.round(taR.height * 100) / 100,
      taMaxHeight: cs.maxHeight,
      taScrollHeight: ta.scrollHeight,
      scrollable: ta.scrollHeight > Math.round(taR.height) + 1,
      boxHeight: Math.round(boxR.height),
      boxWidth: Math.round(boxR.width),
      cardWidth: Math.round(card.getBoundingClientRect().width),
      widthsEqual: Math.round(boxR.width) === Math.round(card.getBoundingClientRect().width),
      pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    });
  })()`))

  // 点「译为雅言」，验证 150 字能被后端接受（后端无上限校验）
  await evalJs(`(function(){ document.querySelector('.home-yayan-submit-btn').click(); return true; })()`)
  let settled = null
  for (let i = 0; i < 44; i++) {
    await wait(500)
    settled = JSON.parse(await evalJs(`(function(){
      var b = document.querySelector('.home-yayan-submit-btn');
      var a = document.querySelector('.home-yayan-ancient-text');
      return JSON.stringify({ btn: b ? b.textContent.trim() : null, ancient: a ? a.textContent.trim() : null });
    })()`))
    if (settled.btn === '译为雅言' && settled.ancient && settled.ancient.indexOf('偷得浮生半日闲') === -1) break
  }
  report.afterTranslate = JSON.parse(await evalJs(`(function(){
    var a = document.querySelector('.home-yayan-ancient-text');
    var cr = document.querySelector('.home-yayan-result-card');
    var badge = document.querySelectorAll('.home-yayan-offline').length;
    var ar = a ? a.getBoundingClientRect() : null;
    var crr = cr ? cr.getBoundingClientRect() : null;
    return JSON.stringify({
      ancientText: a ? a.textContent.trim() : null,
      lines: ar ? Math.round(ar.height / parseFloat(getComputedStyle(a).lineHeight)) : null,
      insideCard: (ar && crr) ? (ar.left >= crr.left - 0.5 && ar.right <= crr.right + 0.5) : null,
      offlineBadge: badge,
      pageOverflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`))

  const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync('D:/sino-wind-taskB/proof/team-main-150chars-390.png', Buffer.from(shot.data, 'base64'))

  await send('Emulation.clearDeviceMetricsOverride')
  ws.close()
  console.log(JSON.stringify(report, null, 2))
}
main().catch((e) => { console.log('FAILED: ' + e.message); process.exit(1) })
