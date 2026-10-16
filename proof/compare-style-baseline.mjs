// 比对改前/改后的计算样式，验证「零视觉变化」
import fs from 'node:fs'

const A = JSON.parse(fs.readFileSync('D:/sino-wind-taskB/proof/_baseline-before.json', 'utf8'))
const B = JSON.parse(fs.readFileSync('D:/sino-wind-taskB/proof/_baseline-after.json', 'utf8'))

let same = 0
const diffs = []
for (const page of Object.keys(A)) {
  for (const sel of Object.keys(A[page] || {})) {
    const a = A[page][sel]
    const b = B[page]?.[sel]
    if (a === null || b === null) { diffs.push(`${sel}: 元素存在性变化 (${a === null ? '改前无' : '改后有'})`); continue }
    for (const p of Object.keys(a)) {
      if (a[p] !== b[p]) diffs.push(`${sel}  ${p}\n        改前: ${String(a[p]).slice(0, 80)}\n        改后: ${String(b[p]).slice(0, 80)}`)
      else same++
    }
  }
}

console.log('════════ 视觉回归比对 ════════')
console.log(`  选择器 ${Object.keys(A).reduce((n, k) => n + Object.keys(A[k]).length, 0)} 个 · 属性比对 ${same + diffs.length} 项`)
console.log(`  一致 ${same} 项 · 差异 ${diffs.length} 项`)
console.log('')
if (!diffs.length) {
  console.log('  ✅ 零视觉变化 —— 所有受影响元素的计算样式逐项一致')
} else {
  console.log('  ⚠️ 存在差异：')
  diffs.forEach((d) => console.log('      ' + d))
}
