// 从既有 483 句语料导出「作品级」诗词库，作为搜索兜底数据源
const fs = require('node:fs')
const path = require('node:path')
const poems = require('D:/sino-wind-taskB/backend/src/data/feihuaPoems.js')

// 按 作品(标题+作者) 聚合，还原完整篇
const byWork = new Map()
for (const p of poems) {
  const key = `${p.author}|${p.title}`
  if (!byWork.has(key)) byWork.set(key, { title: p.title, author: p.author, dynasty: p.dynasty || '待考', source: p.source, lines: [] })
  const w = byWork.get(key)
  if (!w.lines.includes(p.line)) w.lines.push(p.line)
}

const works = [...byWork.values()]
console.log(`作品数: ${works.length}`)
console.log(`朝代分布:`, JSON.stringify(works.reduce((a, w) => (a[w.dynasty] = (a[w.dynasty] || 0) + 1, a), {})))
console.log('\n样例（前 3 首，看能否还原成篇）:')
for (const w of works.slice(0, 3)) {
  console.log(`  《${w.title}》${w.author}（${w.dynasty}）`)
  w.lines.forEach(l => console.log(`     ${l}`))
}

// 检查：同一作品的行是否连续（决定能否按顺序拼成完整诗篇）
let contiguous = 0, broken = 0
for (const w of works) {
  if (w.lines.length <= 1) continue
  const idxs = w.lines.map(l => poems.findIndex(p => p.line === l))
  const sorted = idxs.every((v, i) => i === 0 || v > idxs[i - 1])
  if (sorted) contiguous++; else broken++
}
console.log(`\n行序可还原(连续递增): ${contiguous} 首 / 行序错乱: ${broken} 首`)
console.log(`\n结论: ${broken === 0 ? '✅ 语料行序完整，可直接还原成篇' : '⚠️ 有 ' + broken + ' 首行序错乱，需按原诗文序重排'}`)
