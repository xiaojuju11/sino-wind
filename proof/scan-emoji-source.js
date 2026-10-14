// 扫描已跟踪文件里的原生 Emoji（按 Unicode 码点，不信注释、只看真实字符）
// 用法：node proof/scan-emoji-source.js <file1> [file2] ...
//
// ⚠️ 与本目录 scan-emoji-new.mjs 的分工（两者互补，别混用结论）：
//   · 本脚本【严格版】：把注释里出现的字符也计入命中。
//     适用于"全仓字符洁净度"审计 —— 注释里的 ☀️/↗ 在代码评审语境下也算残留字符。
//   · scan-emoji-new.mjs【注释豁免版】：区分"渲染代码"与"注释"，
//     只有会进入 DOM 的字符才算违规，用于判定 §2.3 图标红线是否真的被违反。
//   我用错过：拿严格版结果去判定"还有 emoji 残留"，得到假阳性
//   （实测 Home.jsx 的 3 处、home.less 的 19 处全在注释里）。
import fs from 'node:fs'

const files = process.argv.slice(2)
if (!files.length) {
  console.log('用法: node proof/scan-emoji-source.js <文件...>')
  process.exit(1)
}

// Emoji 相关码点区间
const RANGES = [
  [0x1F300, 0x1FAFF], // 各类 Emoji（含 ☕🎒🌼🌙 等）
  [0x1F000, 0x1F2FF], // 麻将/扑克/方块
  [0x2600, 0x27BF],   // 杂项符号与装饰符（☀ ⚙ ✏ ✍ 等）
  [0x2B00, 0x2BFF],   // 杂项符号与箭头（⬆ 等）
  [0xFE0F, 0xFE0F],   // 变体选择符（把文字变 Emoji）
  [0x2190, 0x21FF],   // 箭头（↗ ↩ 等字符箭头，团队同样禁用）
  [0x2300, 0x23FF],   // 技术符号（⌄ 等）
]

let total = 0
for (const f of files) {
  if (!fs.existsSync(f)) { console.log(`跳过（不存在）: ${f}`); continue }
  const txt = fs.readFileSync(f, 'utf8')
  const hits = []
  for (let i = 0; i < txt.length; i++) {
    const cp = txt.codePointAt(i)
    const inRange = RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)
    if (inRange) {
      const before = txt.slice(0, i)
      const line = before.split('\n').length
      hits.push({ cp: 'U+' + cp.toString(16).toUpperCase().padStart(4, '0'), ch: String.fromCodePoint(cp), line })
    }
    if (cp > 0xFFFF) i++ // 跳过代理对
  }
  total += hits.length
  if (hits.length === 0) {
    console.log(`✅ ${f}  → 0 个原生 Emoji / 字符箭头`)
  } else {
    console.log(`⚠️  ${f}  → ${hits.length} 处（含注释；是否违规请用 scan-emoji-new.mjs 复核）`)
    for (const h of hits) console.log(`     ${h.cp}  '${h.ch}'  行 ${h.line}`)
  }
}
console.log(`\n合计（含注释）: ${total} 处`)
process.exit(0)
