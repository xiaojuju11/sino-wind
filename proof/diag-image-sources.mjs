// 提取各素材组在文档中的来源声明原文（带文件名与行号，便于回查）
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const walk = (d, out = []) => {
  for (const n of fs.readdirSync(d)) {
    if (['node_modules', '.git', 'dist', '.agents'].includes(n)) continue
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.md$/i.test(n)) out.push(p)
  }
  return out
}
const docs = walk(ROOT)

// 每个素材组的关键词（用于定位其来源声明）
const groups = {
  'assets/home（首页背景/四雅插画）': ['bg-yayan', 'bg-shiwu', 'bg-poem', 'bg-almanac', 'bg-paper', 'yaji-', 'poem-art', '底图', '5 张'],
  'assets/guancang（观藏·先贤立绘·卷轴）': ['guancang', 'sage_libai', 'sage_sushi', 'sage_liqingzhao', 'sage_wangyangming', 'scroll_changhe', 'scroll_lundao', 'scroll_tingyin', 'sage-libai-full', '立绘'],
  'assets/auth（登录注册画稿）': ['reference-login', 'reference-register', '登录画稿', '注册画稿'],
  'assets/shuzhai（书斋插画）': ['avatar_yunshan', 'illus_cangpin', 'illus_qinggui', 'shuzhai'],
  'assets/common（全站背景）': ['bg_guofeng'],
  'assets/scholar-scenes（对席意境）': ['scholar-scenes', 'ImageGen'],
  'images/decor（账号恢复卡）': ['recovery-xuan-paper'],
  'logo.svg / vite.svg': ['logo.svg', 'vite.svg'],
  'docs/design/cankao（参考图）': ['cankao', 'ref-0'],
  'docs/design/phase3（设计稿）': ['phase3', 'portrait_libai', 'Stitch'],
}

const IGNORE = /版权|授权|许可|license|License|LICENSE|不得|禁止|严禁|删除|移除|不要/

for (const [label, keys] of Object.entries(groups)) {
  console.log('\n════════ ' + label + ' ════════')
  const hits = []
  for (const f of docs) {
    const rel = path.relative(ROOT, f).replace(/\\/g, '/')
    const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
    lines.forEach((l, i) => {
      const matched = keys.filter((k) => l.includes(k))
      if (!matched.length) return
      // 只要「来源类」句子：含生成/提供/取自/来自/使用/切图/绘制/原创/下载 等
      if (!/生成|提供|取自|来自|使用|切图|绘制|原创|下载|采用|截取|裁剪|来源|素材|图片|画稿|底图|立绘|出图/.test(l)) return
      hits.push({ rel, line: i + 1, text: l.trim().slice(0, 170), key: matched[0] })
    })
  }
  // 去重并限制条数
  const seen = new Set()
  let shown = 0
  for (const h of hits) {
    const sig = h.text.slice(0, 60)
    if (seen.has(sig)) continue
    seen.add(sig)
    if (shown >= 10) { console.log('  …（另有 ' + (hits.length - shown) + ' 条）'); break }
    console.log('  [' + h.rel + ':' + h.line + ']')
    console.log('      ' + h.text)
    shown++
  }
  if (!hits.length) console.log('  （未找到来源声明）')
}
