// 盘查两件事：
// ① CITY_DICT 的古称里，哪些在别名表/沿革轴中搜不到（输入古称找不到城）
// ② matchAncientCity 兜底路径的假气温使用点
import { readFileSync } from 'node:fs'
import * as ch from 'file:///D:/sino-wind-taskB/frontend/src/utils/cityChronicle.js'

const anc = readFileSync('D:/sino-wind-taskB/frontend/src/utils/ancientCities.js', 'utf8')

// ① 抽 CITY_DICT
const i = anc.indexOf('export const CITY_DICT = {')
const j = anc.indexOf('\n}', i)
const body = anc.slice(i, j)
const dict = {}
for (const m of body.matchAll(/'([^']+)':\s*\{\s*ancient:\s*'([^']*)'/g)) dict[m[1]] = m[2]
console.log('  CITY_DICT 条目:', Object.keys(dict).length)
console.log('')

const unreachable = []
for (const [city, ancient] of Object.entries(dict)) {
  if (!ancient) continue
  const r = ch.cityChronicle(ancient)
  // 期望：输入该古称应能解析到「与词典同名的城市」
  // 注意：geoCities 用全称（大理白族自治州），词典用简称（大理），故按前缀匹配
  const same = r && (r.key === city || r.key.startsWith(city) || city.startsWith(r.key))
  const inAxis = r && r.timeline.some(([, p]) => p === ancient)
  if (!same && !inAxis) unreachable.push(city + ' 的古称「' + ancient + '」→ 搜到 ' + (r ? r.key : '（未收录）'))
}
console.log('  ── 词典古称输入后找不到对应城（' + unreachable.length + '）──')
unreachable.forEach((x) => console.log('    ⚠️ ' + x))
console.log('')

// ② 假气温使用点
console.log('  ── 写死的假气温出现点 ──')
const lines = anc.split(/\r?\n/)
lines.forEach((l, k) => {
  if (/temp:\s*'[^']*'/.test(l) && !/ancient:|desc:/.test(l)) console.log('    ancientCities.js:' + (k + 1) + '  ' + l.trim().slice(0, 90))
})
const tempConst = [...anc.matchAll(/temp:\s*'([^']*)'/g)].map((m) => m[1])
console.log('    合计硬编码 temp 值:', tempConst.length, '处，取值集合:', [...new Set(tempConst)].join(' '))
