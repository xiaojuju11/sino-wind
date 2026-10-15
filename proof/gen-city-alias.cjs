// 从沿革轴自动提取「古称 → 现代城邑」别名表，补全搜索可达性。
// 多城共用同一古称时（如 通州→南通/达州、江州→九江/重庆），
// 取该古称在历史文献中最主要的那一座（以出现次数与是否为该城首条为准）。
const fs = require('node:fs')
const P = 'D:/sino-wind-taskB/frontend/src/utils/cityChronicle.js'

// 载入现有数据
const mod = require('node:module')
const { execFileSync } = require('node:child_process')
// 用 esbuild 风格的动态 import 不方便，故直接解析源码里的对象是脆的 ——
// 改为写一个临时 mjs 取数据
const tmp = process.env.TEMP + '/dump-chronicle.mjs'
fs.writeFileSync(tmp, `import { CITY_CHRONICLE, CITY_ALIAS } from 'file:///D:/sino-wind-taskB/frontend/src/utils/cityChronicle.js'
console.log(JSON.stringify({ CH: CITY_CHRONICLE, ALIAS: CITY_ALIAS }))`, 'utf8')
const out = execFileSync(process.execPath, [tmp], { maxBuffer: 32 * 1024 * 1024 }).toString('utf8')
const { CH, ALIAS } = JSON.parse(out)

// ── 收集：古称 → [{city, 是首条?}] ──
const placeMap = new Map()
for (const [city, tl] of Object.entries(CH)) {
  tl.forEach(([, place], i) => {
    if (place === city) return                    // 与今名相同，无需别名
    if (!placeMap.has(place)) placeMap.set(place, [])
    placeMap.get(place).push({ city, first: i === 0 })
  })
}

// ── 过滤：部族名 / 区域名 / 政权名不是「城名」，不应作为别名（会误导）──
const NOT_CITY = new Set([
  '夫余', '挹娄', '濊貊', '沃沮', '鲜卑', '东胡', '室韦', '苏毗', '呼揭', '哀牢',
  '乌孙', '龟兹', '且兰', '夜郎', '象雄', '辽东', '右北平', '朔方', '上谷', '定襄',
  '云中', '九原', '五原', '胜州', '居延', '贺兰', '渤海国', '单于都护府', '中受降城',
  '安东都护府', '左冯翊', '弘农', '武威郡', '张掖郡', '湟中', '河湟', '碣石',
])

// ── 歧义判定 ──
const auto = {}
const ambiguous = []
for (const [place, list] of placeMap) {
  if (ALIAS[place]) continue                       // 已有人工映射，优先
  if (NOT_CITY.has(place)) continue                // 非城名，跳过
  const cities = [...new Set(list.map((x) => x.city))]
  if (cities.length === 1) { auto[place] = cities[0]; continue }
  // 多城共用：优先「作为某城首条出现」的那个；若首条候选不唯一或无，取名称最短的
  const firstCities = [...new Set(list.filter((x) => x.first).map((x) => x.city))]
  const pool = firstCities.length ? firstCities : cities
  const pick = [...pool].sort((a, b) => a.length - b.length)[0]
  if (!pick) continue
  auto[place] = pick
  ambiguous.push([place, cities, pick])
}

console.log('  自动提取别名:', Object.keys(auto).length)
console.log('  歧义古称（多城共用）:', ambiguous.length)
ambiguous.slice(0, 12).forEach(([p, cs, pick]) => console.log('    ' + p.padEnd(8) + ' 属于 ' + cs.join('/') + '  → 取 ' + pick))

// ── 写回：替换 CITY_ALIAS 区块 ──
let t = fs.readFileSync(P, 'utf8')
const start = t.indexOf('export const CITY_ALIAS = {')
const end = t.indexOf('}', start) + 1
if (start < 0) { console.log('  ❌ 未找到 CITY_ALIAS'); process.exit(1) }

const merged = { ...auto, ...ALIAS }   // 人工映射覆盖自动
const keys = Object.keys(merged).sort((a, b) => a.localeCompare(b, 'zh'))
const lines = []
for (let i = 0; i < keys.length; i += 6) {
  lines.push('  ' + keys.slice(i, i + 6).map((k) => `${k}: '${merged[k]}'`).join(', ') + ',')
}
const block = `// 古称 → 现代城邑（由 proof/gen-city-chronicle.cjs 自动提取并人工校正）。
// 沿革轴里出现的古代城名（广陵、会稽、临淄、华亭…）通过此表可被直接搜到；
// 多城共用同一古称时（通州→南通/达州、江州→九江/重庆 等）取其主要关联城。
// 加入本表后，输入任一古称都能展开对应城邑的前世今生。
export const CITY_ALIAS = {
${lines.join('\n')}
}`
t = t.slice(0, start) + block + t.slice(end)
fs.writeFileSync(P, t, 'utf8')
console.log('\n  已写回 CITY_ALIAS，共', keys.length, '条')
