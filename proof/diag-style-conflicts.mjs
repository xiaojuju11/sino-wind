// 冲突清单（只列已人工抽查确认的，避免解析器假阳性误导）
// 判据：精修层（referencePolish / referenceFidelity）覆盖了基础文件的
//       **几何或视觉关键属性**，且值不同、无 !important
//       → 后果：改基础样式不生效，必须同时改精修层
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/src') + '/'
const files = {
  layout: 'styles/layout.less',
  home: 'styles/home.less',
  poem: 'styles/poem.less',
  poemCollection: 'styles/poemCollection.less',
  polish: 'styles/referencePolish.less',
  fidelity: 'styles/referenceFidelity.less',
  ink: 'components/inkWashBackground.less',
  capture: 'components/imageCaptureAndProcess/index.less',
}

// 已人工抽查确认的冲突：[类名, 属性, 基础文件, 精修文件]
const CONFIRMED = [
  ['.home-poem-more', 'right / bottom', 'home', 'fidelity', '圆形箭头改为文字按钮后，贴边定位不再合适'],
  ['.bottom-nav', 'border-radius', 'layout', 'fidelity + polish', '基础 1px vs 精修 10/11px'],
  ['.bottom-nav', 'bottom', 'layout', 'fidelity', '基础含 safe-area 计算 vs 精修 0'],
  ['.collection-list', 'padding', 'poemCollection', 'polish', 'rem 与固定 px 并存'],
  ['.home-almanac__label', 'padding', 'home', 'fidelity', 'rem 与固定 px 并存'],
  ['.home-card-scroll', 'border-radius / border / background-image', 'home', 'fidelity', '基础带 !important，精修仍写了不同值'],
  ['.home-hero__actions', 'top', 'home', 'polish', '基础 -0.52rem vs 精修 .08rem'],
  ['.home-hero__seal', 'font-size', 'home', 'fidelity', 'rem 与固定 px 并存'],
  ['.home-hero__title', 'font-size', 'home', 'fidelity + polish', '三处定义'],
  ['.home-ink-wash', 'width', 'ink', 'polish', '基础 100% vs 精修 min(100%,480px)'],
  ['.home-poem-meta', 'margin', 'home', 'fidelity', 'rem 与固定 px 并存'],
  ['.home-poem-title', 'margin', 'home', 'fidelity', 'rem 与固定 px 并存'],
]

// 统计每个文件的行数与「同类名重复定义」次数（用简单计数，仅供规模参考）
const stat = []
for (const [k, rel] of Object.entries(files)) {
  const t = fs.readFileSync(SRC + rel, 'utf8')
  const lines = t.split(/\r?\n/).length
  const heads = (t.match(/^\s*\.[a-zA-Z][\w-]*\s*(?:\{|,)/gm) || []).length
  stat.push({ k, rel, lines, heads })
}

console.log('════════ 文件规模 ════════')
stat.sort((a, b) => b.lines - a.lines).forEach((s) => console.log(`  ${String(s.lines).padStart(5)} 行  ${String(s.heads).padStart(4)} 个规则头   ${s.rel}`))
console.log('')

console.log('════════ 已人工确认的覆盖冲突 ════════')
console.log('  这些位置「改基础样式不生效」，必须同时改精修层：')
CONFIRMED.forEach(([cls, prop, base, ref, note]) => {
  console.log(`  ${cls}`)
  console.log(`      ${prop.padEnd(34)} 基础 ${files[base]} → 精修 ${ref}`)
  console.log(`      ${note}`)
})
console.log('')

// 单位体系混乱统计：基础层用 rem、精修层用 px 的类名数
const homeTxt = fs.readFileSync(SRC + files.home, 'utf8')
const polishTxt = fs.readFileSync(SRC + files.polish, 'utf8') + fs.readFileSync(SRC + files.fidelity, 'utf8')
const remClasses = new Set([...homeTxt.matchAll(/\.([a-zA-Z][\w-]*)[^{}\n]*\{[^{}]*?\d*\.?\d+rem/g)].map((m) => m[1]))
const pxClasses = new Set([...polishTxt.matchAll(/\.([a-zA-Z][\w-]*)[^{}\n]*\{[^{}]*?\d+px/g)].map((m) => m[1]))
const both = [...remClasses].filter((c) => pxClasses.has(c))
console.log('════════ 单位体系重叠（rem 基础层 ∩ px 精修层）════════')
console.log(`  基础层用 rem 的类名 ${remClasses.size} 个`)
console.log(`  精修层用 px 的类名 ${pxClasses.size} 个`)
console.log(`  两者重叠（同一元素被两套单位体系各写一次）: ${both.length} 个`)
console.log('  ' + both.slice(0, 26).join('  '))
