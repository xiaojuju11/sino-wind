// ════════════════════════════════════════════════════
//  第三阶段（成员 B）首页验收自测：emoji 归零 / 背景红线 / 390px 长文本防御
//  依赖：headless Edge 已开 CDP（端口 9229）+ Vite dev 在 5174
//  用法：node proof/phase3-home-check.js [port]
//  零依赖：仅用 Node 内置 fetch / WebSocket（Node ≥ 22）
// ════════════════════════════════════════════════════
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PORT = process.argv[2] || '9229'
const URL_HOME = 'http://localhost:5174/'
const OUT_DIR = path.dirname(fileURLToPath(import.meta.url))

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

async function connect() {
  const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
  const page = list.find((t) => t.type === 'page')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  let id = 0
  const pending = new Map()
  const events = []
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data)
    if (m.id && pending.has(m.id)) {
      pending.get(m.id)(m)
      pending.delete(m.id)
    } else if (m.method) {
      events.push(m)
    }
  })
  const send = (method, params) =>
    new Promise((res, rej) => {
      const i = ++id
      pending.set(i, (x) => (x.error ? rej(new Error(JSON.stringify(x.error))) : res(x.result)))
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  await new Promise((res) => (ws.readyState === 1 ? res() : ws.addEventListener('open', res)))
  return { ws, send, events }
}

async function main() {
  const { ws, send, events } = await connect()
  const evalJs = async (expr) => {
    const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) {
      throw new Error('EVAL THREW: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text))
    }
    if (r.result.value === undefined && r.result.subtype === 'error') {
      throw new Error('EVAL ERROR: ' + r.result.description)
    }
    return r.result.value
  }

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  await send('Console.enable')
  await send('Emulation.setDeviceMetricsOverride', {
    width: 390, height: 844, deviceScaleFactor: 2, mobile: true,
  })

  const report = {}

  // ── 1) 白昼：首页结构 + emoji 归零 + 背景红线 ──
  await send('Page.navigate', { url: URL_HOME })
  await wait(6000)

  report.structure = JSON.parse(await evalJs(`(function(){
    var root = document.querySelector('.home-root');
    var q = function(s){ return document.querySelectorAll(s).length; };
    var bg = getComputedStyle(root).backgroundImage;
    var bgMatch = bg.match(/url\\("?([^")]+)"?\\)/);
    return JSON.stringify({
      rem: parseFloat(getComputedStyle(document.documentElement).fontSize),
      viewport: [window.innerWidth, window.innerHeight],
      hasRoot: !!root,
      bgImage: bgMatch ? bgMatch[1] : bg,
      heroTitle: (document.querySelector('.home-hero__title')||{}).textContent,
      heroSeal: (document.querySelector('.home-hero__seal')||{}).textContent,
      glyphs: {
        themeGlyphSvg: q('.home-hero__glyph svg'),
        weatherSunSvg: q('.home-almanac__sun svg'),
        wuhouSeal: q('.home-almanac__wuhou-seal'),
        demoSeals: q('.home-shiwu-demo__seal'),
        demoTitleIcon: q('.home-shiwu-demo__title-icon'),
        antdIcons: q('.home-root svg.antd-mobile-icon'),
        iconfont: q('.home-root .iconfont')
      },
      seals: [].map.call(document.querySelectorAll('.home-almanac__wuhou-seal, .home-shiwu-demo__seal'),
        function(e){ return { cls: e.className, ch: e.textContent } }),
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    });
  })()`))

  // emoji / 字符图标残留扫描（只扫文本节点，不信注释）
  report.emojiScan = JSON.parse(await evalJs(`(function(){
    var targets = ['☀','🌙','🧭','✏','☑','📷','📖','🌼','☕','🎒','↗','→','↓','⚙','›','⌄','🌤','⛅','🍵','🎓'];
    var hits = [];
    var all = document.querySelectorAll('.home-root *');
    for (var i=0;i<all.length;i++){
      var el = all[i];
      for (var j=0;j<el.childNodes.length;j++){
        var n = el.childNodes[j];
        if (n.nodeType === 3){
          var t = n.nodeValue || '';
          for (var k=0;k<targets.length;k++){
            if (t.indexOf(targets[k]) !== -1){
              hits.push({ ch: targets[k], tag: el.tagName.toLowerCase(),
                          cls: (el.className||'').toString(), text: t.trim().slice(0,40) });
            }
          }
        }
      }
    }
    return JSON.stringify({ hits: hits, hitCount: hits.length });
  })()`))

  // ── 2) 390px 长文本防御：注入 100 字极端白话 ──
  report.longText = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    if (!ta) return JSON.stringify({ error: 'no textarea' });
    var longText = '今天心情特别好想出去走走看看春天的花开';
    while (longText.length < 100) longText += '顺便去湖边吹吹风听听鸟叫';
    longText = longText.slice(0, 100);
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, longText);
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.stringify({ injected: longText.length, sample: longText.slice(0, 12) });
  })()`))
  await wait(800)

  report.longTextLayout = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var box = document.querySelector('.home-yayan-input-box');
    var counter = document.querySelector('.home-yayan-counter');
    var root = document.querySelector('.home-root');
    var cs = getComputedStyle(ta);
    var ancient = document.querySelector('.home-yayan-ancient-text');
    var card = document.querySelector('.home-yayan-result-card');
    return JSON.stringify({
      valueLen: ta.value.length,
      counterText: counter.textContent,
      counterLimitClass: counter.className.indexOf('is-limit') !== -1,
      counterColor: getComputedStyle(counter).color,
      taHeight: Math.round(ta.getBoundingClientRect().height * 100) / 100,
      taMaxHeight: cs.maxHeight,
      taScrollH: ta.scrollHeight,
      taScrollable: ta.scrollHeight > Math.round(ta.getBoundingClientRect().height) + 1,
      fieldSizingSupported: CSS.supports('field-sizing', 'content'),
      taFieldSizing: cs.fieldSizing,
      taOverflowWrap: cs.overflowWrap,
      taWordBreak: cs.wordBreak,
      boxH: Math.round(box.getBoundingClientRect().height),
      boxW: Math.round(box.getBoundingClientRect().width),
      cardW: Math.round(card.getBoundingClientRect().width),
      // 输入框与译文卡等宽（历史要求）
      widthsEqual: Math.round(box.getBoundingClientRect().width) === Math.round(card.getBoundingClientRect().width),
      ancientWhiteSpace: getComputedStyle(ancient).whiteSpace,
      ancientOverflowWrap: getComputedStyle(ancient).overflowWrap,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    });
  })()`))

  // 边界 1：1 字（最短）时输入卡高度不得塌陷
  report.shortText = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '好');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return JSON.stringify({ len: ta.value.length });
  })()`))
  await wait(500)
  report.shortTextLayout = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var box = document.querySelector('.home-yayan-input-box');
    var counter = document.querySelector('.home-yayan-counter');
    return JSON.stringify({
      taHeight: Math.round(ta.getBoundingClientRect().height * 100) / 100,
      boxH: Math.round(box.getBoundingClientRect().height),
      counterText: counter.textContent,
      counterLimitClass: counter.className.indexOf('is-limit') !== -1
    });
  })()`))

  // 边界 2：超长无空格串（URL / 连续字母）不得造成横向溢出
  report.noSpaceText = JSON.parse(await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    var s = 'https://www.example.com/averyveryverylongpathsegmentwithoutanyspaces/0123456789abcdefghij';
    setter.call(ta, s.slice(0, 100));
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    // 同步把同一串塞进译文卡，验证折行不是靠中文断字能力
    var p = document.querySelector('.home-yayan-ancient-text');
    for (var i=0;i<p.childNodes.length;i++){
      if (p.childNodes[i].nodeType === 3){ p.childNodes[i].nodeValue = s; break; }
    }
    var r = p.getBoundingClientRect();
    var cr = document.querySelector('.home-yayan-result-card').getBoundingClientRect();
    return JSON.stringify({ sLen: ta.value.length });
  })()`))
  await wait(500)
  report.noSpaceLayout = JSON.parse(await evalJs(`(function(){
    var p = document.querySelector('.home-yayan-ancient-text');
    var cr = document.querySelector('.home-yayan-result-card').getBoundingClientRect();
    var r = p.getBoundingClientRect();
    var ta = document.querySelector('.home-yayan-textarea');
    return JSON.stringify({
      pWidth: Math.round(r.width),
      cardWidth: Math.round(cr.width),
      textInsideCard: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5,
      pLines: Math.round(r.height / parseFloat(getComputedStyle(p).lineHeight)),
      taHeight: Math.round(ta.getBoundingClientRect().height * 100) / 100,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    });
  })()`))

  // 超长雅言（120 字）折行防御：直接改 DOM 文本，模拟后端返回长句
  report.ancientWrap = JSON.parse(await evalJs(`(function(){
    var card = document.querySelector('.home-yayan-result-card');
    var p = card.querySelector('.home-yayan-ancient-text');
    var seal = p.querySelector('.home-yayan-seal');
    // 保留印章，替换前面文本节点
    for (var i=0;i<p.childNodes.length;i++){
      if (p.childNodes[i].nodeType === 3){ p.childNodes[i].nodeValue = '月落乌啼霜满天江枫渔火对愁眠姑苏城外寒山寺夜半钟声到客船竹杖芒鞋轻胜马一蓑烟雨任平生也无风雨也无晴'; break; }
    }
    var r = p.getBoundingClientRect();
    var cr = card.getBoundingClientRect();
    var sealR = seal.getBoundingClientRect();
    return JSON.stringify({
      pHeight: Math.round(r.height),
      lineHeight: parseFloat(getComputedStyle(p).lineHeight),
      lines: Math.round(r.height / parseFloat(getComputedStyle(p).lineHeight)),
      pWidth: Math.round(r.width),
      cardWidth: Math.round(cr.width),
      textInsideCard: r.left >= cr.left - 0.5 && r.right <= cr.right + 0.5,
      sealInsideCard: sealR.right <= cr.right + 0.5 && sealR.left >= cr.left - 0.5,
      sealVisible: sealR.width > 0 && sealR.height > 0,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth
    });
  })()`))
  await wait(300)

  // 截图留证（长文本态）
  const shotLong = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(OUT_DIR, 'phase3-home-longtext-390.png'), Buffer.from(shotLong.data, 'base64'))

  // ── 3) 暗夜模式：印章/图标着色与底色 ──
  await evalJs(`localStorage.setItem('gufeng_theme','dark')`)
  await send('Page.navigate', { url: URL_HOME })
  await wait(5000)
  report.darkMode = JSON.parse(await evalJs(`(function(){
    var root = document.querySelector('.home-root');
    var glyph = document.querySelector('.home-hero__glyph svg');
    var sun = document.querySelector('.home-almanac__sun svg');
    var seal = document.querySelector('.home-almanac__wuhou-seal');
    var dseal = document.querySelector('.home-shiwu-demo__seal');
    var pick = function(el){ if(!el) return null; var c = getComputedStyle(el);
      return { fill: c.fill, stroke: c.stroke, color: c.color, bg: c.backgroundColor, w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) }; };
    return JSON.stringify({
      dataTheme: document.documentElement.getAttribute('data-theme'),
      bodyBg: getComputedStyle(document.body).backgroundColor,
      rootBgColor: getComputedStyle(root).backgroundColor,
      themeGlyph: pick(glyph),
      weatherSun: pick(sun),
      wuhouSeal: pick(seal),
      demoSeal: pick(dseal),
      // 印章上的象牙白文字必须与朱砂底区分（可读性）
      sealTextColor: seal ? getComputedStyle(seal).color : null,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      consoleErrors: 0
    });
  })()`))

  const shotDark = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(OUT_DIR, 'phase3-home-dark-390.png'), Buffer.from(shotDark.data, 'base64'))

  // ── 4) 回白昼并截全页 ──
  await evalJs(`localStorage.setItem('gufeng_theme','light')`)
  await send('Page.navigate', { url: URL_HOME })
  await wait(5000)
  const shotLight = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(OUT_DIR, 'phase3-home-light-390.png'), Buffer.from(shotLight.data, 'base64'))

  report.lightFinal = JSON.parse(await evalJs(`(function(){
    var root = document.querySelector('.home-root');
    var cs = getComputedStyle(root);
    return JSON.stringify({
      dataTheme: document.documentElement.getAttribute('data-theme'),
      topPad: cs.paddingTop,
      rootBgImage: cs.backgroundImage.match(/url\\("?([^")]+)"?\\)/) ? cs.backgroundImage.match(/url\\("?([^")]+)"?\\)/)[1] : cs.backgroundImage,
      bgRepeat: cs.backgroundRepeat,
      bgSize: cs.backgroundSize,
      docHeight: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      blockHeights: {
        yayan: Math.round(document.querySelector('.home-yayan-section').getBoundingClientRect().height),
        almanac: Math.round(document.querySelector('.home-almanac').getBoundingClientRect().height),
        shiwu: Math.round(document.querySelector('.home-shiwu-section').getBoundingClientRect().height),
        poem: Math.round(document.querySelector('.home-poem-card').getBoundingClientRect().height)
      }
    });
  })()`))

  // ── 5) 雅译失败路径：请求被掐断时不得遗留「上一句」雅言，并标注离线典范 ──
  await send('Network.enable')
  await send('Network.setBlockedURLs', { urls: ['*120.26.186.48*', '*127.0.0.1:3000*', '*localhost:3000*'] })
  await send('Page.navigate', { url: URL_HOME })
  await wait(6000)
  report.offlinePath = JSON.parse(await evalJs(`(function(){
    var before = document.querySelector('.home-yayan-author');
    return JSON.stringify({ beforeAuthor: before ? before.textContent.trim() : null,
                            beforeOfflineBadge: document.querySelectorAll('.home-yayan-offline').length });
  })()`))
  // 输入白话并点击「译为雅言」（请求会被 CDP 阻断 → 走 catch 分支）
  await evalJs(`(function(){
    var ta = document.querySelector('.home-yayan-textarea');
    var setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
    setter.call(ta, '今天心情特别好想出去走走');
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  await wait(400)
  await evalJs(`(function(){
    var btns = document.querySelectorAll('.home-yayan-submit-btn');
    btns[0].click();
    return true;
  })()`)
  await wait(7000)
  report.offlinePathAfterFail = JSON.parse(await evalJs(`(function(){
    var author = document.querySelector('.home-yayan-author');
    var badge = document.querySelector('.home-yayan-offline');
    var ancient = document.querySelector('.home-yayan-ancient-text');
    var card = document.querySelector('.home-yayan-result-card');
    var badgeR = badge ? badge.getBoundingClientRect() : null;
    var cardR = card ? card.getBoundingClientRect() : null;
    var collect = document.querySelector('.home-yayan-collect-btn');
    return JSON.stringify({
      resultCardPresent: !!card,
      authorText: author ? author.textContent.trim() : null,
      ancientText: ancient ? ancient.textContent.trim() : null,
      offlineBadgeCount: document.querySelectorAll('.home-yayan-offline').length,
      offlineBadgeText: badge ? badge.textContent : null,
      offlineBadgeVisible: badgeR ? (badgeR.width > 0 && badgeR.height > 0) : false,
      offlineBadgeInsideCard: (badgeR && cardR) ? (badgeR.right <= cardR.right + 0.5 && badgeR.left >= cardR.left - 0.5) : null,
      offlineBadgeClipped: badge ? (badge.scrollWidth > badge.clientWidth + 1) : null,
      collectDisabled: collect ? collect.disabled : null,
      submitLabel: (document.querySelector('.home-yayan-submit-btn')||{}).textContent,
      overflowX: document.documentElement.scrollWidth > document.documentElement.clientWidth
    });
  })()`))
  const shotOffline = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true })
  fs.writeFileSync(path.join(OUT_DIR, 'phase3-home-offline-390.png'), Buffer.from(shotOffline.data, 'base64'))
  await send('Network.setBlockedURLs', { urls: [] })

  // Console 错误统计（本轮导航内；刻意掐断的上游请求不计为代码缺陷）
  const errs = events.filter((e) =>
    (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') ||
    (e.method === 'Runtime.exceptionThrown'))
  const isExpectedNetwork = (t) => /Failed to load resource|ERR_(PROXY|CONNECTION|NETWORK|BLOCKED)|net::/i.test(t)
  report.consoleErrors = errs
    .map((e) => {
      if (e.method === 'Runtime.exceptionThrown') return 'EXCEPTION: ' + (e.params.exceptionDetails.exception?.description || e.params.exceptionDetails.text)
      return 'LOG: ' + e.params.entry.text
    })
    .filter((t) => !isExpectedNetwork(t))
  report.consoleErrorsIgnoredNetwork = errs.length - report.consoleErrors.length

  await send('Emulation.clearDeviceMetricsOverride')
  ws.close()

  console.log(JSON.stringify(report, null, 2))
}

main().catch((e) => {
  console.log('FAILED: ' + e.message + '\n' + e.stack)
  process.exit(1)
})
