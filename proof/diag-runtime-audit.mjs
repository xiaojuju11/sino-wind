// 运行时审计：把时令区块的所有交互走一遍，抓控制台错误与异常
const nt = await (await fetch('http://127.0.0.1:9230/json/new?http://localhost:5180/home', { method: 'PUT' })).json()
const TARGET = nt.id
const ws = new WebSocket(nt.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
const errs = []
ws.addEventListener('message', (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) }
  if (m.method === 'Runtime.exceptionThrown') errs.push('[异常] ' + String(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text || '').split('\n').slice(0, 2).join(' / '))
  if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errs.push('[控制台] ' + m.params.entry.text.slice(0, 180))
  if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') errs.push('[console.error] ' + m.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 180))
})
const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result))); ws.send(JSON.stringify({ id: i, method: me, params: p })) })
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
const ev = async (e, ms = 20000) => {
  const r = await Promise.race([send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]).catch((err) => ({ result: { value: 'ERR ' + err.message } }))
  return r.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await wait(15000)

const step = async (label, expr, ms = 1500) => {
  const r = await ev(expr)
  await wait(ms)
  console.log(`  ${r === false || r === 'null' ? '⚠️' : '✅'} ${label}`)
  return r
}

console.log('  ── 交互走查 ──')
await step('打开城邑志（点城市名）', `document.querySelector('.home-almanac__city')?.click() || true`)
await step('搜西安', `(() => { const i=document.querySelector('.home-chronicle__search input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'西安'); i.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
await step('点留驻此时空', `document.querySelector('.home-chronicle__commit')?.click() || true`, 4000)
await step('打开时辰弹窗（点亥时）', `document.querySelector('.home-almanac__shichen')?.click() || true`)
await step('时辰弹窗：横向滑动', `(() => { const s=document.querySelector('.home-shichen__strip'); s.scrollLeft = 600; return true })()`)
await step('收起时辰弹窗', `document.querySelector('.home-shichen__head button')?.click() || true`)
await step('再开城邑志，搜不存在的城', `(() => { document.querySelector('.home-almanac__city')?.click(); return true })()`)
await step('输入「尔湾」', `(() => { const i=document.querySelector('.home-chronicle__search input'); const s=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value').set; s.call(i,'尔湾'); i.dispatchEvent(new Event('input',{bubbles:true})); return true })()`)
await step('点推荐城「苏州」', `[...document.querySelectorAll('.home-chronicle__reco button')].find(b=>b.innerText==='苏州')?.click() || true`)
await step('收起城邑志', `document.querySelector('.home-chronicle__head button')?.click() || true`)
await step('切主题（暗色）', `document.querySelector('.adm-image-viewer-close, [aria-label*="主题"], [class*="theme-toggle"]')?.click() || true`, 1200)

console.log('')
console.log('  ── 抓到的错误 ──')
const uniq = [...new Set(errs)]
if (!uniq.length) console.log('    ✅ 无错误')
else uniq.slice(0, 12).forEach((e) => console.log('    ❌ ' + e))
console.log('')
console.log('  错误总数:', errs.length, ' 去重后:', uniq.length)

await fetch(`http://127.0.0.1:9230/json/close/${TARGET}`).catch(() => {})
ws.close()
process.exit(0)
