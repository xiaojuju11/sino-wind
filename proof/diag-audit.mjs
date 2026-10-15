// 系统性审计：时令区块 + 城邑数据 + 合并后的代码
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const R = []
const add = (level, title, detail) => R.push({ level, title, detail })

// ══ 1. 沿革轴数据审计 ══
const ch = await import('file:///D:/sino-wind-taskB/frontend/src/utils/cityChronicle.js')
const CH = ch.CITY_CHRONICLE
const ALIAS = ch.CITY_ALIAS
const PROV = ch.PROVINCE_CAPITAL

// 1.1 空/异常条目
const emptyNote = [], emptyPlace = [], dupEra = []
for (const [city, tl] of Object.entries(CH)) {
  if (!tl.length) add('🔴', '空沿革轴', city)
  tl.forEach(([era, place, note]) => {
    if (!place || !place.trim()) emptyPlace.push(city + '/' + era)
    if (!note || !note.trim()) emptyNote.push(city + '/' + era)
  })
  const eras = tl.map((x) => x[0])
  if (new Set(eras).size !== eras.length) dupEra.push(city + '(' + eras.join(',') + ')')
}
add(emptyPlace.length ? '🟡' : '✅', '沿革轴缺城名', emptyPlace.length ? emptyPlace.slice(0, 8).join(' ') : '无')
add(emptyNote.length ? '🟡' : '✅', '沿革轴缺雅注', emptyNote.length ? emptyNote.slice(0, 8).join(' ') : '无')
add(dupEra.length ? '🟡' : '✅', '同城朝代名重复', dupEra.length ? dupEra.slice(0, 6).join(' ') : '无')

// 1.2 别名指向不存在的城市
const keys = new Set(Object.keys(CH))
const deadAlias = Object.entries(ALIAS).filter(([, v]) => !keys.has(v))
add(deadAlias.length ? '🔴' : '✅', '别名指向不存在的城', deadAlias.length ? deadAlias.slice(0, 10).map((x) => x[0] + '→' + x[1]).join(' ') : '无')

// 1.3 省名映射指向不存在的城
const deadProv = Object.entries(PROV).filter(([, v]) => !keys.has(v))
add(deadProv.length ? '🔴' : '✅', '省名映射指向不存在的城', deadProv.length ? deadProv.map((x) => x[0] + '→' + x[1]).join(' ') : '无')

// 1.4 古称可达性
const placeSet = new Set()
for (const tl of Object.values(CH)) for (const [, p] of tl) placeSet.add(p)
const unreach = [...placeSet].filter((p) => !keys.has(p) && !ch.cityChronicle(p))
add(unreach.length > 40 ? '🟡' : '✅', '沿革轴城名搜不到', unreach.length + ' 个' + (unreach.length ? '：' + unreach.slice(0, 12).join(' ') : ''))

// ══ 2. 城市数据审计 ══
const g = await import('file:///D:/sino-wind-taskB/frontend/src/utils/geoCities.js')
const CITIES = g.CITIES
const badCoord = CITIES.filter(([, , la, ln]) => !(la >= 3 && la <= 54 && ln >= 73 && ln <= 136))
add(badCoord.length ? '🔴' : '✅', '城市坐标越界', badCoord.length ? badCoord.map((c) => c[0]).join(' ') : '无')
const junk = CITIES.filter(([n]) => n === '县' || n.includes('直辖县级'))
add(junk.length ? '🟡' : '✅', 'geoCities 残留脏数据', junk.length ? junk.map((c) => c[0] + '(' + c[1] + ')').join(' ') : '无')
const dupName = CITIES.map((c) => c[0]).filter((n, i, a) => a.indexOf(n) !== i)
add(dupName.length ? '🟡' : '✅', '城市重名', dupName.length ? [...new Set(dupName)].join(' ') : '无')
const noChronicle = CITIES.filter(([n]) => !keys.has(n))
add(noChronicle.length ? '🟡' : '✅', '城市无沿革轴', noChronicle.length ? noChronicle.length + ' 个：' + noChronicle.slice(0, 12).map((c) => c[0]).join(' ') : '无')

// ══ 3. 时辰数据审计 ══
const sh = await import('file:///D:/sino-wind-taskB/frontend/src/utils/shichen.js')
add(sh.SHICHEN.length === 12 ? '✅' : '🔴', '十二时辰条目数', sh.SHICHEN.length + ' 条')
const noAlias = sh.SHICHEN.filter((s) => !s.alias)
add(noAlias.length ? '🔴' : '✅', '时辰缺雅称', noAlias.length ? noAlias.map((s) => s.name).join(' ') : '无')
// 时辰覆盖 24 小时？
const covered = new Set()
for (let h = 0; h < 24; h++) covered.add(sh.shichenOf(new Date(2026, 0, 1, h, 30)).name)
add(covered.size === 12 ? '✅' : '🔴', '时辰覆盖 24 小时', covered.size + '/12 个时辰被覆盖')

// ══ 4. 主干上同事代码的已知问题是否仍在 ══
const mainAnc = execFileSync('git', ['show', 'team/main:frontend/src/utils/ancientCities.js'], { cwd: 'D:/sino-wind-taskB', maxBuffer: 8 * 1024 * 1024 }).toString('utf8')
add(mainAnc.includes('whois.pconline.com.cn') ? '🔴' : '✅', '主干：pconline 无 CORS 仍在使用', mainAnc.includes('whois.pconline.com.cn') ? '按 UTF-8 解 GBK，且接口无 CORS → 浏览器 fetch 必失败' : '已移除')
add(mainAnc.includes('http://ip-api.com') ? '🔴' : '✅', '主干：明文 HTTP 备选仍在', mainAnc.includes('http://ip-api.com') ? 'HTTPS 部署会被混合内容拦截' : '已移除')

// ══ 输出 ══
console.log('════════ 审计结果 ════════')
const order = { '🔴': 0, '🟡': 1, '✅': 2 }
R.sort((a, b) => order[a.level] - order[b.level])
for (const r of R) console.log(`${r.level} ${r.title.padEnd(26)} ${r.detail}`)
console.log('')
const red = R.filter((r) => r.level === '🔴').length
const yellow = R.filter((r) => r.level === '🟡').length
console.log(`合计：🔴 ${red} 项严重   🟡 ${yellow} 项次要   ✅ ${R.length - red - yellow} 项正常`)
