// 视觉回归基线：记录受影响元素的关键计算样式
// 用法：改前跑一次存基线，改后跑一次比对，完全一致才算「零视觉变化」
import fs from 'node:fs'

const OUT = process.argv[2] || 'D:/sino-wind-taskB/proof/_style-baseline.json'

// 覆盖目标元素（.home-poem-more 等）及其所在页面
const PAGES = [
  { url: 'http://localhost:5180/home', sels: [
    '.home-root', '.home-poem-more', '.home-poem-card', '.home-poem-title', '.home-poem-meta',
    '.home-card-scroll', '.home-hero__title', '.home-hero__sub', '.home-hero__seal',
    '.home-hero__actions', '.home-ink-wash', '.home-almanac__label', '.home-almanac__roam',
    '.home-section-title', '.home-yayan-input-box', '.home-shiwu-demo', '.bottom-nav',
  ] },
  { url: 'http://localhost:5180/poem-collection', sels: ['.collection-list', '.poem-collection-root'] },
]

const nt = await (await fetch('http://127.0.0.1:9230/json/new?about:blank', { method: 'PUT' })).json()
const TARGET = nt.id
const ws = new WebSocket(nt.webSocketDebuggerUrl)
let id = 0
const pend = new Map()
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id) } })
const send = (me, p) => new Promise((res, rej) => { const i = ++id; pend.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result))); ws.send(JSON.stringify({ id: i, method: me, params: p })) })
await new Promise((r) => (ws.readyState === 1 ? r() : ws.addEventListener('open', r)))
const ev = async (e, ms = 25000) => {
  const r = await Promise.race([send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }), new Promise((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]).catch((err) => ({ result: { value: 'ERR ' + err.message } }))
  return r.result?.value
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })

const PROPS = ['width','height','borderTopLeftRadius','borderTopWidth','borderTopStyle','borderTopColor','backgroundColor','backgroundImage','boxShadow','fontSize','marginTop','marginBottom','marginLeft','marginRight','paddingTop','paddingLeft','right','bottom','top','left','position','display','minHeight','overflow','opacity','transform']

const result = {}
for (const pg of PAGES) {
  await send('Page.navigate', { url: pg.url })
  await wait(15000)
  // 冻结动画，消除抖动
  await ev(`(() => { const st=document.createElement('style'); st.textContent='*,*::before,*::after{animation:none!important;transition:none!important}'; document.head.appendChild(st); return true })()`)
  await wait(700)
  const snap = await ev(`(() => {
    const props = ${JSON.stringify(PROPS)}
    const out = {}
    for (const sel of ${JSON.stringify(pg.sels)}) {
      const el = document.querySelector(sel)
      if (!el) { out[sel] = null; continue }
      const cs = getComputedStyle(el)
      const o = {}
      for (const p of props) o[p] = cs[p]
      out[sel] = o
    }
    return JSON.stringify(out)
  })()`)
  result[pg.url] = JSON.parse(snap || '{}')
  console.log(`  ${pg.url}  采集 ${Object.keys(result[pg.url]).length} 个选择器`)
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 2), 'utf8')
console.log(`  已写入 ${OUT}`)
await fetch(`http://127.0.0.1:9230/json/close/${TARGET}`).catch(() => {})
ws.close()
process.exit(0)
