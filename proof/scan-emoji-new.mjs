// 扫描新增前端源码中的原生 Emoji / 字符箭头（图标红线自查）
import fs from 'node:fs'

const FILES = [
  'frontend/src/components/InkParticleField.jsx',
  'frontend/src/components/RadarChart.jsx',
  'frontend/src/components/TonePattern.jsx',
  'frontend/src/styles/inkEngine.less',
  'frontend/src/styles/poemMetre.less',
  'frontend/src/utils/inkEngine/physics.js',
  'frontend/src/utils/inkEngine/solarTerms.js',
  'frontend/src/utils/inkEngine/InkEngine.js',
  'frontend/src/utils/poemMetre.js',
  'frontend/src/utils/radarGeometry.js',
]

// 只查真正的 Emoji/符号区间；箭头类字符在注释里属于正常中文技术书写，
// 但要单独统计，以便确认"渲染内容"里没有它们
const EMOJI_RANGES = [
  [0x1f300, 0x1faff], [0x1f000, 0x1f2ff], [0x2600, 0x27bf],
  [0x2b00, 0x2bff], [0xfe0f, 0xfe0f], [0x1f900, 0x1f9ff],
]

let emojiTotal = 0
let inCodeTotal = 0
const report = []

for (const f of FILES) {
  if (!fs.existsSync(f)) { report.push(`跳过(不存在): ${f}`); continue }
  const txt = fs.readFileSync(f, 'utf8')
  const lines = txt.split('\n')
  const hits = []
  lines.forEach((line, li) => {
    // 判断该行是否为注释行（Less 的 // 与 /* */、JS 的 //）
    const trimmed = line.trim()
    const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')
    for (let i = 0; i < line.length; i++) {
      const cp = line.codePointAt(i)
      if (EMOJI_RANGES.some(([lo, hi]) => cp >= lo && cp <= hi)) {
        const ch = String.fromCodePoint(cp)
        hits.push({ ch, cp: 'U+' + cp.toString(16).toUpperCase(), line: li + 1, comment: isComment })
        emojiTotal++
        if (!isComment) inCodeTotal++
      }
      if (cp > 0xffff) i++
    }
  })
  const codeHits = hits.filter((h) => !h.comment)
  report.push(codeHits.length === 0
    ? `✅ ${f}  → 渲染代码中 0 个 Emoji${hits.length ? `（注释中 ${hits.length} 处仅为文字说明）` : ''}`
    : `❌ ${f}  → 代码中 ${codeHits.length} 处 Emoji: ${codeHits.map((h) => `${h.ch}@${h.line}`).join(' ')}`)
}

console.log('=== 新增前端源码 Emoji 自查（图标红线）===')
report.forEach((r) => console.log(r))
console.log(`\n渲染代码中 Emoji 合计: ${inCodeTotal}`)
console.log(`（含注释）合计: ${emojiTotal}`)
process.exit(inCodeTotal === 0 ? 0 : 2)
