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

// ⚠️ 自指修正（必须固化，否则重跑会覆盖人工修正 —— 本次实际发生过：
//   重跑后 南京→开封、西安→辽源 等 8 处错误复活）。
// 规则：别名键本身若已是一个城市名，则删除该别名 —— 查表时 CITY_CHRONICLE
// 会直接命中自身；留着会造成「输入城市名却展开到另一个城市」，比搜不到更糟。
// 成因：沿革轴里别城的古称会与某城的今名撞车，如开封轴有「金元·南京」、
//       辽源轴有「西安县」，自动提取时按「名称最短」选中了错误的一方。
const CITY_KEYS = new Set(Object.keys(CH))
let selfFixed = 0
for (const k of Object.keys(merged)) {
  if (CITY_KEYS.has(k) && k !== '咸阳') { delete merged[k]; selfFixed++ }
}
merged['咸阳'] = '西安'   // 唯一的例外：秦咸阳与汉长安同处一地，属合理映射
console.log('  已移除自指别名（键本身是城名）:', selfFixed)

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

// ── 补充：省名/单字简称 → 省会 映射（不可由沿革轴自动推导，须显式维护）──
// 用户会直接输入省名（如「四川」）来找一省之地，而沿革轴是按城市组织的。
// 目标须全部存在于 CITY_CHRONICLE，否则搜省名会拿到空结果。
const PROVINCE_CAPITAL = {
  北京: '北京', 天津: '天津', 上海: '上海', 重庆: '重庆',
  河北: '石家庄', 山西: '太原', 内蒙古: '呼和浩特', 辽宁: '沈阳', 吉林: '长春',
  黑龙江: '哈尔滨', 江苏: '南京', 浙江: '杭州', 安徽: '合肥', 福建: '福州',
  江西: '南昌', 山东: '济南', 河南: '郑州', 湖北: '武汉', 湖南: '长沙',
  广东: '广州', 广西: '南宁', 海南: '海口', 四川: '成都', 贵州: '贵阳',
  云南: '昆明', 西藏: '拉萨', 陕西: '西安', 甘肃: '兰州', 青海: '西宁',
  宁夏: '银川', 新疆: '乌鲁木齐', 台湾: '台北', 香港: '香港', 澳门: '澳门',
  京: '北京', 津: '天津', 蜀: '成都', 蓉: '成都', 渝: '重庆', 粤: '广州',
  湘: '长沙', 鄂: '武汉', 豫: '郑州', 鲁: '济南', 苏: '南京', 浙: '杭州',
  皖: '合肥', 闽: '福州', 赣: '南昌', 冀: '石家庄', 晋: '太原', 陕: '西安',
  甘: '兰州', 青: '西宁', 云: '昆明', 贵: '贵阳', 桂: '南宁', 琼: '海口',
  辽: '沈阳', 吉: '长春', 黑: '哈尔滨', 新: '乌鲁木齐', 藏: '拉萨',
  蒙: '呼和浩特', 宁: '银川',
}
// 校验：目标必须存在，否则搜省名会空
const missing = Object.entries(PROVINCE_CAPITAL).filter(([, cap]) => !CH[cap])
if (missing.length) console.log('  ⚠️ 省名映射目标缺失:', missing.map(([p, c]) => p + '→' + c).join(' '))
else console.log('  ✅ 省名映射目标齐全:', Object.keys(PROVINCE_CAPITAL).length, '条')
