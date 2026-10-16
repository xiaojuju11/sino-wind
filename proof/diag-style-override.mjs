// 正确的 LESS 规则解析器（按花括号配平，支持单行多属性与多层嵌套）
// 上一版的两个 bug：
//   ① 只匹配行首无缩进的规则头 → 漏掉精修层的嵌套规则
//   ② 遇到行内 `}` 就 break → 单行多属性写法只取到第一条
// 本版：把选择器按嵌套路径拼成完整选择器，逐字符扫描声明与花括号。
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../frontend/src')
const REFINERS = ['styles/referencePolish.less', 'styles/referenceFidelity.less', 'context/theme.less']
const walk = (d, out = []) => { for (const n of fs.readdirSync(d)) { const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p, out); else if (/\.less$/.test(n)) out.push(p) } return out }

/** 解析一个 less 文件 → [{ selector, prop, val, line, file }] */
function parseLess(src, file) {
  const out = []
  // 去掉块注释，保留行数（用等长空白替换）
  const clean = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const lineOf = (idx) => clean.slice(0, idx).split('\n').length

  const stack = [] // 选择器栈
  let i = 0
  let buf = ''
  const pushDecls = (text, startIdx, ctxSelectors) => {
    for (const d of text.split(';')) {
      const m = d.match(/^\s*([a-zA-Z-]+)\s*:\s*([\s\S]+?)\s*$/)
      if (!m) continue
      for (const sel of ctxSelectors) {
        out.push({ selector: sel, prop: m[1], val: m[2].replace(/\s+/g, ' ').trim(), line: lineOf(startIdx), file })
      }
    }
  }
  const curSelectors = () => {
    if (!stack.length) return []
    // 只保留最后两级足够定位（顶层 + 本层）
    const joined = stack.map((s) => s.sel).join(' ')
    return [joined, stack[stack.length - 1].sel]
  }

  while (i < clean.length) {
    const ch = clean[i]
    if (ch === '{') {
      const sel = buf.trim().replace(/\s+/g, ' ')
      buf = ''
      stack.push({ sel, declStart: i + 1 })
      i++
      continue
    }
    if (ch === '}') {
      const top = stack.pop()
      if (top) {
        const text = clean.slice(top.declStart, i)
        // 只把「本层直接声明」记下（不含更深嵌套）
        const noNested = text.replace(/\{[^{}]*\}/g, ' ')
        pushDecls(noNested, top.declStart, curSelectors().length ? [stack.length ? stack.map((s) => s.sel).join(' ') : top.sel, top.sel] : [top.sel])
      }
      buf = ''
      i++
      continue
    }
    if (ch === ';' && !stack.length) { buf = ''; i++; continue }
    // 顶层声明（less 变量等）忽略
    if (ch === ';') { i++; continue }
    buf += ch
    i++
  }
  return out
}

const all = new Map() // 类名 -> [{prop,val,file,line,refiner}]
for (const f of walk(SRC)) {
  const rel = path.relative(SRC, f).replace(/\\/g, '/')
  const decls = parseLess(fs.readFileSync(f, 'utf8'), rel)
  for (const d of decls) {
    // 只取选择器的【最后一个类名】—— 那才是真正被设置样式的元素。
    // （上一版把后代选择器里的每个类名都算作被定义，如 `.home-root .home-ink-wash`
    //   会把 .home-root 也算进来，产生大量假阳性。）
    // 对 `.a, .b { ... }` 这种分组，逐个分支各取其最后一个类名。
    for (const branch of d.selector.split(',')) {
      const ms = [...branch.matchAll(/\.([a-zA-Z][\w-]*)/g)]
      if (!ms.length) continue
      const cls = ms[ms.length - 1][1]
      if (!all.has(cls)) all.set(cls, [])
      all.get(cls).push({ prop: d.prop, val: d.val, file: d.file, line: d.line, refiner: REFINERS.includes(d.file) })
    }
  }
}
console.log(`  解析完成：${all.size} 个类名，${[...all.values()].reduce((n, v) => n + v.length, 0)} 条声明`)
console.log('')

const KEY = /^(width|height|min-height|max-height|right|bottom|left|top|position|padding|margin|background|background-color|background-image|border|border-radius|box-shadow|font-size|display|transform|opacity|z-index|overflow)$/
const hits = []
for (const [cls, list] of all) {
  const byProp = new Map()
  for (const x of list) { if (!byProp.has(x.prop)) byProp.set(x.prop, []); byProp.get(x.prop).push(x) }
  for (const [prop, arr] of byProp) {
    if (!KEY.test(prop)) continue
    const base = arr.filter((x) => !x.refiner)
    const ref = arr.filter((x) => x.refiner && !/!important/.test(x.val))
    if (!base.length || !ref.length) continue
    const bv = [...new Set(base.map((x) => x.val))]
    if (bv.length !== 1) continue
    for (const r of ref) if (r.val !== bv[0]) hits.push({ cls, prop, base: base[0], ref: r })
  }
}
hits.sort((a, b) => a.cls.localeCompare(b.cls))
console.log('════════ 静默覆盖：精修层改了基础值且无 !important ════════')
console.log(`  合计 ${hits.length} 处 · 涉及 ${new Set(hits.map((h) => h.cls)).size} 个类名`)
console.log('')
let cur = ''
for (const h of hits) {
  if (h.cls !== cur) { cur = h.cls; console.log(`  .${h.cls}`) }
  console.log(`      ${h.prop.padEnd(16)} 基础 "${h.base.val.slice(0, 30)}"  (${h.base.file}:${h.base.line})`)
  console.log(`      ${' '.repeat(16)} → 精修 "${h.ref.val.slice(0, 30)}"  (${h.ref.file}:${h.ref.line})`)
}
const GEOM = /^(width|height|min-height|max-height|right|bottom|left|top|position|display|overflow)$/
const geo = hits.filter((h) => GEOM.test(h.prop))
console.log('')
console.log(`════════ 其中几何/尺寸类（最高危）：${geo.length} 处 ════════`)
