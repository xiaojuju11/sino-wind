// 对主干（team/main）做一次审计 —— 这是用户实际看到的版本
import { execFileSync } from 'node:child_process'

const git = (p) => execFileSync('git', ['show', 'team/main:' + p], { cwd: 'D:/sino-wind-taskB', maxBuffer: 32 * 1024 * 1024 }).toString('utf8')
const R = []
const add = (lv, title, detail) => R.push({ lv, title, detail })

// ── 1. 主干的前端源码检查 ──
const home = git('frontend/src/pages/Home.jsx')
const anc = git('frontend/src/utils/ancientCities.js')

add(anc.includes('whois.pconline.com.cn') ? '🔴' : '✅', 'pconline 接口（无 CORS，GBK）', anc.includes('whois.pconline.com.cn') ? '仍在用 → 浏览器 fetch 必失败，且按 UTF-8 解 GBK' : '已移除')
add(anc.includes('http://ip-api.com') ? '🔴' : '✅', '明文 HTTP 备选接口', anc.includes('http://ip-api.com') ? 'HTTPS 部署会被混合内容策略拦截' : '已移除')
add(/temp:\s*'\d+°'/.test(anc) ? '🟡' : '✅', '写死的假气温', /temp:\s*'\d+°'/.test(anc) ? 'ancientCities.js 中 temp 为字符串常量（如 \'22°\'），并非真实气温' : '无')
add(anc.includes('export const CITY_DICT') ? '✅' : '🟡', 'CITY_DICT 是否导出', anc.includes('export const CITY_DICT') ? '已导出' : '未导出（外部取不到）')

// ── 2. 主干是否含我的修复 ──
add(home.includes('PROVINCE_CAPITAL') || git('frontend/src/utils/cityChronicle.js').includes('PROVINCE_CAPITAL') ? '✅' : '🟡', '省名检索（四川等）', git('frontend/src/utils/cityChronicle.js').includes('PROVINCE_CAPITAL') ? '已在主干' : '❌ 不在主干 → 搜「四川」无结果')

// 主干的自指别名
const chSrc = git('frontend/src/utils/cityChronicle.js')
const i = chSrc.indexOf('export const CITY_ALIAS = {')
const j = chSrc.indexOf('\n}', i)
const amap = {}
for (const m of chSrc.slice(i, j).matchAll(/([^\s{,}]+):\s*'([^']*)'/g)) amap[m[1]] = m[2]
const ckeys = new Set([...chSrc.matchAll(/^  ([^\s:{}]+): \[\n/gm)].map((m) => m[1]))
const selfBad = Object.entries(amap).filter(([k, v]) => ckeys.has(k) && k !== v && k !== '咸阳')
add(selfBad.length ? '🔴' : '✅', '自指别名错误（输城名指向别城）', selfBad.length ? selfBad.map((x) => x[0] + '→' + x[1]).join(' ') : '无')

// 主干同城朝代重复
const dup = []
const blocks = [...chSrc.matchAll(/^  ([^\s:{}]+): \[\n([\s\S]*?)\n  \],/gm)]
for (const b of blocks) {
  const eras = [...b[2].matchAll(/\['([^']*)'/g)].map((m) => m[1])
  if (new Set(eras).size !== eras.length) dup.push(b[1])
}
add(dup.length ? '🟡' : '✅', '同城朝代名重复', dup.length ? dup.join(' ') : '无')

// geoCities 脏数据
const geo = git('frontend/src/utils/geoCities.js')
const dirty = [...geo.matchAll(/^\s*\['(县|自治区直辖县级行政区划)'/gm)].length
add(dirty ? '🟡' : '✅', 'geoCities 脏数据条目', dirty ? dirty + ' 条（县 / 自治区直辖县级行政区划）' : '无')

// ── 3. 跨文件一致性：CITY_DICT 的古称 vs 沿革轴 ──
const dictKeys = [...anc.matchAll(/^\s*'([^']+)':\s*\{\s*ancient:/gm)].map((m) => m[1])
const conflict = []
for (const k of dictKeys) {
  const kv = new RegExp(`^  ${k}: \\[\\n    \\['[^']*', '([^']*)'`).exec(chSrc)
  if (!kv) continue
  const firstPlace = kv[1]
  const dictAncient = new RegExp(`'${k}':\\s*\\{\\s*ancient:\\s*'([^']*)'`).exec(anc)?.[1]
  if (dictAncient && !chSrc.includes(`'${dictAncient}'`) ) conflict.push(`${k}: 词典古称 ${dictAncient} 在沿革轴中不存在`)
}
add(conflict.length ? '🟡' : '✅', 'CITY_DICT 古称 vs 沿革轴一致性', conflict.length ? conflict.slice(0, 8).join(' | ') : '无冲突')

console.log('════════ 主干（team/main）审计 ════════')
const order = { '🔴': 0, '🟡': 1, '✅': 2 }
R.sort((a, b) => order[a.lv] - order[b.lv])
for (const r of R) console.log(`${r.lv} ${r.title.padEnd(28)} ${r.detail}`)
const red = R.filter((r) => r.lv === '🔴').length
const yel = R.filter((r) => r.lv === '🟡').length
console.log('')
console.log(`合计：🔴 ${red}   🟡 ${yel}   ✅ ${R.length - red - yel}`)
