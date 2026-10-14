// 诊断：真实诗数据的平水韵字表覆盖率与未收录末字
import { classifyTone, rhymeGroupOf, buildMetreReport } from '../frontend/src/utils/poemMetre.js'

const BASE = 'http://localhost:5174'
async function fetchJson(url) {
  const r = await fetch(url)
  return r.json()
}

const poems = []
// 随机接口多取几首
for (let i = 0; i < 12; i++) {
  try {
    const j = await fetchJson(`${BASE}/api/poem/random`)
    const d = j?.data
    if (d && d.title) poems.push(d)
  } catch { /* 忽略 */ }
}
// 搜索接口取几类
for (const q of ['月', '风', '山', '春', '秋', '花']) {
  try {
    const j = await fetchJson(`${BASE}/api/poem/search?q=${encodeURIComponent(q)}`)
    const list = j?.data?.list || j?.data || []
    for (const d of (Array.isArray(list) ? list : []).slice(0, 3)) if (d?.title) poems.push(d)
  } catch { /* 忽略 */ }
}

// 去重
const seen = new Set()
const uniq = poems.filter((p) => {
  const k = p.title + '|' + (p.author || '')
  if (seen.has(k)) return false
  seen.add(k)
  return true
})

console.log(`取到诗作 ${uniq.length} 首\n`)

const unknownChars = new Map()
const unknownEnds = new Map()
let totalChars = 0
let unknownTotal = 0
let fallbackTotal = 0
const endChars = new Map()

for (const p of uniq) {
  const raw = p.paragraphs || p.content || []
  const lines = (Array.isArray(raw) ? raw : [raw]).map((s) => String(s).replace(/[^\u4e00-\u9fff]/g, '')).filter(Boolean)
  const rep = buildMetreReport(lines)
  if (!rep.ok) continue
  for (const line of rep.lines) {
    for (const t of line.tones) {
      totalChars++
      if (t.tone === 'unknown') {
        unknownTotal++
        unknownChars.set(t.ch, (unknownChars.get(t.ch) || 0) + 1)
      } else if (t.confidence === 'modern') fallbackTotal++
    }
    const last = line.tones[line.tones.length - 1]
    if (last) {
      endChars.set(last.ch, (endChars.get(last.ch) || 0) + 1)
      if (last.tone === 'unknown' || !rhymeGroupOf(last.ch)) {
        unknownEnds.set(last.ch, (unknownEnds.get(last.ch) || 0) + 1)
      }
    }
  }
}

const pct = (n, d) => `${((n / Math.max(1, d)) * 100).toFixed(1)}%`
console.log(`总字数 ${totalChars}`)
console.log(`字表未收录（unknown）: ${unknownTotal}  ${pct(unknownTotal, totalChars)}`)
console.log(`普通话回退（modern） : ${fallbackTotal}  ${pct(fallbackTotal, totalChars)}`)
console.log(`平水韵字表直判        : ${totalChars - unknownTotal - fallbackTotal}  ${pct(totalChars - unknownTotal - fallbackTotal, totalChars)}`)

const top = (m, n = 40) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)
console.log(`\n未收录字 TOP40（共 ${unknownChars.size} 个不同字）：`)
console.log(top(unknownChars).map(([c, n]) => `${c}×${n}`).join(' '))

console.log(`\n不在字表的句末字（韵脚缺口，共 ${unknownEnds.size} 个）：`)
console.log(top(unknownEnds, 40).map(([c, n]) => `${c}×${n}`).join(' '))

console.log(`\n所有句末字（韵脚）分布 TOP30：`)
console.log(top(endChars, 30).map(([c, n]) => `${c}×${n}${rhymeGroupOf(c) ? '' : '(无韵部)'}`).join(' '))
