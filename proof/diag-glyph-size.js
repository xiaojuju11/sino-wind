// 诊断：内联 SVG 与印章的最终生效尺寸 / 来源规则
const PORT = process.argv[2] || '9229'
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function main() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
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
  await send('Page.enable'); await send('Runtime.enable')
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
  await send('Page.navigate', { url: 'http://localhost:5174/' })
  await wait(6000)

  const expr = `(function(){
    var out = {};
    var probe = function(sel){
      var el = document.querySelector(sel);
      if (!el) return null;
      var cs = getComputedStyle(el);
      var r = el.getBoundingClientRect();
      var parent = el.parentElement;
      var pcs = parent ? getComputedStyle(parent) : null;
      var rules = [];
      // 找出所有命中该元素的 CSS 规则（含 width/height/font-size 声明）
      for (var i=0;i<document.styleSheets.length;i++){
        var ss = document.styleSheets[i];
        var href = ss.href || 'inline';
        var rl; try { rl = ss.cssRules } catch(e){ continue }
        if (!rl) continue;
        var walk = function(list, media){
          for (var j=0;j<list.length;j++){
            var rule = list[j];
            if (rule.cssRules && rule.conditionText !== undefined){ walk(rule.cssRules, (media?media+' ':'')+'@media '+rule.conditionText); continue }
            if (!rule.selectorText) continue;
            var hit = false;
            try { hit = el.matches(rule.selectorText) } catch(e){ continue }
            if (!hit) continue;
            var t = rule.style.cssText || '';
            if (/width|height|font-size|fill|stroke/.test(t)) rules.push({ href: href.split('/').pop(), media: media||'', sel: rule.selectorText, css: t.slice(0,160) });
          }
        };
        walk(rl, '');
      }
      return {
        sel: sel,
        tag: el.tagName.toLowerCase(),
        rect: [Math.round(r.width*100)/100, Math.round(r.height*100)/100],
        computed: { width: cs.width, height: cs.height, fontSize: cs.fontSize, color: cs.color, fill: cs.fill, stroke: cs.stroke },
        parentFontSize: pcs ? pcs.fontSize : null,
        ownFontSizeAttr: el.getAttribute('font-size'),
        rules: rules
      };
    };
    out.htmlFontSize = getComputedStyle(document.documentElement).fontSize;
    out.heroGlyphSvg = probe('.home-hero__glyph svg');
    out.weatherSunSvg = probe('.home-almanac__sun svg');
    out.wuhouSeal = probe('.home-almanac__wuhou-seal');
    out.demoTitleIcon = probe('.home-shiwu-demo__title-icon');
    out.demoSeal = probe('.home-shiwu-demo__seal');
    return JSON.stringify(out);
  })()`
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  if (r.exceptionDetails) { console.log('THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); process.exit(1) }
  console.log(JSON.stringify(JSON.parse(r.result.value), null, 2))
  ws.close()
}
main().catch((e) => { console.log('FAILED: ' + e.message); process.exit(1) })
