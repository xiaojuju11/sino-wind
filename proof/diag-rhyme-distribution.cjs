// 为「押韵方案讨论」文档采集真实数据
const path = require('path')
const B = 'D:/sino-wind-taskB/backend/src'
const engine = require(path.join(B, 'utils/feihuaEngine.js'))
const { poems, rhymeGroups, KEYWORDS, SAGES, rhymeData } = engine

const REQ10 = ['花', '月', '春', '风', '夜', '酒', '云', '雨', '山', '水']

console.log('══════ A. 题库总览 ══════')
console.log(`诗句 ${poems.length} 句 / 韵部 ${rhymeData.groups.length} 个 / 韵字 ${rhymeData.groups.reduce((n, g) => n + g.characters.length, 0)} 个`)
const per = rhymeData.groups.map(g => g.characters.length)
console.log(`每部韵字数: 最小 ${Math.min(...per)} / 中位 ${per.sort((a,b)=>a-b)[Math.floor(per.length/2)]} / 最大 ${Math.max(...per)}`)

console.log('\n══════ B. 关键：每令字被韵部切碎后的可用句数分布 ══════')
console.log('（"可用句数"= 含该令字 且 句末韵脚属该韵部。这决定某个"令字+韵部"组合能不能玩）')
console.log('')
console.log('令字   含字总句  韵部数  每韵部可用句数(降序)                    仅1句的韵部  可玩韵部(≥8句)')
console.log('-'.repeat(104))
const summary = []
for (const kw of [...new Set([...REQ10, ...KEYWORDS])]) {
  const withKw = poems.filter(p => p.line.includes(kw))
  const byR = {}
  for (const p of withKw) for (const g of rhymeGroups(p.line)) (byR[g] ||= new Set()).add(p.line)
  const counts = Object.entries(byR).map(([g, s]) => [g, s.size]).sort((a, b) => b[1] - a[1])
  const ones = counts.filter(([, n]) => n === 1).length
  const playable = counts.filter(([, n]) => n >= 8).length
  const dist = counts.slice(0, 6).map(([g, n]) => `${g.replace(/^(上平声|下平声|上声|去声|入声)/, '')}:${n}`).join(' ')
  const flag = REQ10.includes(kw) ? '★' : ' '
  console.log(`${flag}${kw}    ${String(withKw.length).padStart(6)}  ${String(counts.length).padStart(6)}   ${dist.padEnd(44)} ${String(ones).padStart(6)}      ${String(playable).padStart(6)}`)
  summary.push({ kw, total: withKw.length, groups: counts.length, ones, playable })
}

console.log('\n══════ C. 若"开局选韵"(方案1C)：各令字有多少个韵部能开局(≥8句) ══════')
for (const s of summary.filter(x => REQ10.includes(x.kw))) {
  console.log(`  ${s.kw}: ${s.groups} 个韵部中，可开局 ${s.playable} 个；只有单句的 ${s.ones} 个`)
}

console.log('\n══════ D. 若"逐句合规"(方案1B)：玩家可选句子总量（= 含令字总数）══════')
for (const s of summary.filter(x => REQ10.includes(x.kw))) {
  console.log(`  ${s.kw}: ${s.total} 句可选`)
}

console.log('\n══════ E. 极端情形：有多少「令字+韵部」组合根本开不了局 ══════')
const totalCombos = []
for (const s of summary.filter(x => REQ10.includes(x.kw))) {
  totalCombos.push(...[s.groups, s.playable])
}
console.log('  说明：方案 1C（开局选韵）下，玩家若选到只有 1-2 句的韵部，开局即无句可续。')
console.log('')
console.log('  各令字「可用句数 ≥8」的韵部占比：')
let sumPlay = 0, sumGrp = 0
for (const s of summary.filter(x => REQ10.includes(x.kw))) {
  sumPlay += s.playable; sumGrp += s.groups
  const pct = ((s.playable / s.groups) * 100).toFixed(0)
  console.log(`    ${s.kw}: ${s.playable}/${s.groups} = ${pct}%`)
}
console.log(`  合计: ${sumPlay}/${sumGrp} = ${((sumPlay / sumGrp) * 100).toFixed(0)}% 的「令字+韵部」组合能正常开局`)
