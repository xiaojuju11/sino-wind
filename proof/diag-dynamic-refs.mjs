// 精确列出所有「模板串拼资源路径」的行（动态引用来源）
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const walk = (d, out = []) => {
  if (!fs.existsSync(d)) return out
  for (const n of fs.readdirSync(d)) {
    if (['node_modules', 'dist'].includes(n)) continue
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (/\.(jsx?|less|css)$/.test(n)) out.push(p)
  }
  return out
}

const INTERP = '${'
console.log('════ 含 assets/ 且含模板插值（${…}）的行 ════')
let count = 0
for (const f of walk(ROOT + '/frontend/src')) {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/')
  fs.readFileSync(f, 'utf8').split(/\r?\n/).forEach((l, i) => {
    if (l.includes('assets/') && l.includes(INTERP)) {
      count++
      console.log(`  ${rel}:${i + 1}`)
      console.log(`      ${l.trim().slice(0, 120)}`)
    }
  })
}
console.log(`  合计 ${count} 处`)

console.log('')
console.log('════ 指定两行的上下文 ════')
for (const [f, n] of [['frontend/src/components/InviteDrawer.jsx', 11], ['frontend/src/pages/PoemPage.jsx', 490]]) {
  const L = fs.readFileSync(path.join(ROOT, f), 'utf8').split(/\r?\n/)
  console.log(`  ── ${path.basename(f)}:${n}`)
  for (let i = Math.max(0, n - 3); i < Math.min(L.length, n + 2); i++) {
    console.log(`    ${String(i + 1).padStart(4)}: ${L[i].trim().slice(0, 120)}`)
  }
}
