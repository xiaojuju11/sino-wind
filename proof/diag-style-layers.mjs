// 多层样式覆盖审计
// 目标：找出被「多层补丁」反复覆盖的类名 —— 即本次踩到的那类问题
//   （旧版式留下的补丁没清理，改样式时被意外覆盖）
// 判据：
//   ① 同一类名在多个 less 文件里各定义一次 → 跨层覆盖（可能是有意精修，也可能是残留）
//   ② 同一类名在【同一文件】里定义 ≥2 次 → 文件内自相覆盖（几乎必是残留）
//   ③ 类名被 JSX 使用但完全没有样式 → 空壳（另一类问题）
import fs from 'node:fs'
import path from 'node:path'

const SRC = 'D:/sino-wind-taskB/frontend/src'
const walk = (d, out = []) => {
  for (const n of fs.readdirSync(d)) {
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}
const all = walk(SRC)
const lessFiles = all.filter((f) => /\.less$/.test(f))
const jsxFiles = all.filter((f) => /\.jsx?$/.test(f))

// ── 1. 收集每个 less 文件里定义的顶层类名 ──
const defs = new Map() // className -> [{file, line, props:[...]}]
for (const f of lessFiles) {
  const rel = path.relative(SRC, f).replace(/\\/g, '/')
  const lines = fs.readFileSync(f, 'utf8').split(/\r?\n/)
  lines.forEach((l, i) => {
    // 只看形如 `.name {` 或 `.name,` 的规则头（排除嵌套 &）
    const m = l.match(/^\s*\.([a-zA-Z][\w-]*)\s*(?:\{|,)/)
    if (!m) return
    const cls = m[1]
    // 抓取该规则块内的属性名
    const props = []
    for (let k = i + 1; k < lines.length && k < i + 60; k++) {
      if (/^\s*\}/.test(lines[k])) break
      const pm = lines[k].match(/^\s*([a-z-]+)\s*:/)
      if (pm) props.push(pm[1])
    }
    if (!defs.has(cls)) defs.set(cls, [])
    defs.get(cls).push({ file: rel, line: i + 1, props })
  })
}

// ── 2. 分类 ──
const crossLayer = []   // 跨文件重复定义
const sameFile = []     // 同文件重复定义（更可疑）
for (const [cls, list] of defs) {
  if (list.length < 2) continue
  const byFile = new Map()
  list.forEach((d) => { byFile.set(d.file, (byFile.get(d.file) || 0) + 1) })
  const dupInFile = [...byFile.entries()].filter(([, n]) => n > 1)
  if (dupInFile.length) sameFile.push({ cls, list, dupInFile })
  if (byFile.size > 1) crossLayer.push({ cls, list, files: byFile.size })
}

// ── 3. 判断重叠属性（真正会互相覆盖的）──
const intersect = (a, b) => a.filter((x) => b.includes(x))

sameFile.sort((a, b) => b.list.length - a.list.length)
crossLayer.sort((a, b) => b.files - a.files)

console.log('════════ 扫描范围 ════════')
console.log(`  less 文件 ${lessFiles.length} 个 · jsx 文件 ${jsxFiles.length} 个 · 类名 ${defs.size} 个`)
console.log('')

console.log('════════ ① 同一文件内重复定义（几乎必是残留补丁）════════')
if (!sameFile.length) console.log('  ✅ 无')
for (const s of sameFile.slice(0, 14)) {
  console.log(`  .${s.cls}  —— ${s.list.length} 次定义`)
  s.list.forEach((d) => console.log(`      ${d.file}:${d.line}   [${d.props.slice(0, 6).join(' ')}]`))
  // 若同文件内有重叠属性，指出具体属性
  for (let i = 0; i < s.list.length; i++) {
    for (let j = i + 1; j < s.list.length; j++) {
      if (s.list[i].file !== s.list[j].file) continue
      const ov = intersect(s.list[i].props, s.list[j].props)
      if (ov.length) console.log(`      ⚠️ 行${s.list[i].line} 与 行${s.list[j].line} 重叠属性: ${ov.join(' ')}`)
    }
  }
}
console.log('')

console.log('════════ ② 跨文件重复定义（可能是精修层，也可能冲突）════════')
console.log(`  合计 ${crossLayer.length} 个类名被 ≥2 个文件定义`)
for (const c of crossLayer.slice(0, 20)) {
  const files = [...new Set(c.list.map((d) => d.file))]
  console.log(`  .${c.cls}   (${files.length} 个文件)`)
  c.list.slice(0, 6).forEach((d) => console.log(`      ${d.file}:${d.line}   [${d.props.slice(0, 5).join(' ')}]`))
}
console.log('')

// ── 4. 空壳：JSX 用了但没样式 ──
const used = new Set()
for (const f of jsxFiles) {
  const t = fs.readFileSync(f, 'utf8')
  for (const m of t.matchAll(/className=(?:"([^"]+)"|'([^']+)'|\{`([^`]+)`\})/g)) {
    const v = m[1] || m[2] || m[3] || ''
    v.split(/[\s${}]+/).forEach((c) => { if (/^[a-zA-Z][\w-]*$/.test(c)) used.add(c) })
  }
}
const orphan = [...used].filter((c) => !defs.has(c))
console.log('════════ ③ JSX 使用但样式表里找不到的类名 ════════')
console.log(`  合计 ${orphan.length} 个（可能是全局类 / 动态拼接 / 真缺失）`)
console.log('  ' + orphan.slice(0, 30).join('  '))
