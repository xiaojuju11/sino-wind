// 古今时令与天象 · 数据与算法层
//
// 设计要点（2026-10-15 改版）：
//  1. 物候跟【节气】走，不再绑在城市上 —— 物候本是节气的属性
//     （如寒露三候：鸿雁来宾 / 雀入大水为蛤 / 菊有黄华），全国同一节气一致。
//     原实现给每个城市硬编了一个物候，且与节气无关。
//  2. 气温取【真实】数据（Open-Meteo，免费无 Key），原实现是写死的假值。
//  3. 诗句按【季节】分组，原实现给每个城市硬编一句，且全是春诗（与"时令"矛盾）。
//  4. 定位：GPS → IP → 默认北京。
import { solarTermIndex, solarTermName } from './inkEngine/solarTerms.js'
import { CITIES, nearestCity, DEFAULT_CITY } from './geoCities.js'

// ════════════════════════════════════════════════════
//  二十四节气 · 三候与天气
//  候序 0/1/2 为节气内第 1/2/3 候（每候 5 天）
//  出处：《月令七十二候集解》（元代吴澄）系统
// ════════════════════════════════════════════════════
export const TERM_INFO = {
  立春: { hou: ['东风解冻', '蛰虫始振', '鱼陟负冰'], weather: '乍暖还寒' },
  雨水: { hou: ['獭祭鱼', '候雁北', '草木萌动'], weather: '细雨初生' },
  惊蛰: { hou: ['桃始华', '仓庚鸣', '鹰化为鸠'], weather: '春雷始鸣' },
  春分: { hou: ['玄鸟至', '雷乃发声', '始电'], weather: '惠风和畅' },
  清明: { hou: ['桐始华', '田鼠化为鴽', '虹始见'], weather: '天朗气清' },
  谷雨: { hou: ['萍始生', '鸣鸠拂其羽', '戴胜降于桑'], weather: '雨生百谷' },
  立夏: { hou: ['蝼蝈鸣', '蚯蚓出', '王瓜生'], weather: '绿荫渐浓' },
  小满: { hou: ['苦菜秀', '靡草死', '麦秋至'], weather: '麦气初盈' },
  芒种: { hou: ['螳螂生', '鶗鴂鸣', '反舌无声'], weather: '梅雨将至' },
  夏至: { hou: ['鹿角解', '蝉始鸣', '半夏生'], weather: '日长至' },
  小暑: { hou: ['温风至', '蟋蟀居壁', '鹰始鸷'], weather: '温风徐来' },
  大暑: { hou: ['腐草为萤', '土润溽暑', '大雨时行'], weather: '溽暑蒸腾' },
  立秋: { hou: ['凉风至', '白露降', '寒蝉鸣'], weather: '凉风初至' },
  处暑: { hou: ['鹰乃祭鸟', '天地始肃', '禾乃登'], weather: '暑气渐消' },
  白露: { hou: ['鸿雁来', '玄鸟归', '群鸟养羞'], weather: '露凝而白' },
  秋分: { hou: ['雷始收声', '蛰虫坯户', '水始涸'], weather: '秋高气爽' },
  寒露: { hou: ['鸿雁来宾', '雀入大水为蛤', '菊有黄华'], weather: '露气清冷' },
  霜降: { hou: ['豺乃祭兽', '草木黄落', '蛰虫咸俯'], weather: '霜色初凝' },
  立冬: { hou: ['水始冰', '地始冻', '雉入大水为蜃'], weather: '水始成冰' },
  小雪: { hou: ['虹藏不见', '天气上升地气下降', '闭塞而成冬'], weather: '虹藏不见' },
  大雪: { hou: ['鹖鴠不鸣', '虎始交', '荔挺出'], weather: '雪盛天寒' },
  冬至: { hou: ['蚯蚓结', '麋角解', '水泉动'], weather: '阴极阳生' },
  小寒: { hou: ['雁北乡', '鹊始巢', '雉始雊'], weather: '寒气渐盛' },
  大寒: { hou: ['鸡始乳', '征鸟厉疾', '水泽腹坚'], weather: '寒气之逆极' },
}

/** 当前节气内处于第几候（0/1/2）：按距节气起始的天数 / 5 */
export function houIndex(date = new Date()) {
  // 该节气起始的黄经边界对应的近似日期：用「距下一个节气」反推已过天数
  const daysToNext = 15 / 0.9856 // ≈15.22 天为一个节气
  const remaining = daysRemainingInTerm(date)
  const passed = Math.max(0, daysToNext - remaining)
  return Math.min(2, Math.max(0, Math.floor(passed / 5)))
}

/** 距本节气结束（下一个节气）还有多少天 */
export function daysRemainingInTerm(date = new Date()) {
  const lon = solarApparentLongitudeLocal(date)
  const nextBoundary = (Math.floor(lon / 15) + 1) * 15
  const remainDeg = ((nextBoundary - lon) % 360 + 360) % 360
  return remainDeg / 0.9856
}

function solarApparentLongitudeLocal(date) {
  const jd = date.getTime() / 86400000 + 2440587.5
  const n = jd - 2451545.0
  const L = (280.460 + 0.9856474 * n) % 360
  const g = (((357.528 + 0.9856003 * n) % 360) * Math.PI) / 180
  const lambda = L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)
  return ((lambda % 360) + 360) % 360
}

/** 当前时令：节气名 + 第几候 + 物候 + 天气词 */
export function currentTerm(date = new Date()) {
  const name = solarTermName(date)
  const info = TERM_INFO[name] || { hou: ['—'], weather: '' }
  const idx = houIndex(date)
  return {
    name,
    index: solarTermIndex(date),
    houIndex: idx,
    hou: info.hou[idx] || info.hou[0],
    weather: info.weather,
    season: seasonKey(date),
  }
}

function seasonKey(date) {
  const lon = solarApparentLongitudeLocal(date)
  if (lon >= 315 || lon < 45) return 'spring'
  if (lon < 135) return 'summer'
  if (lon < 225) return 'autumn'
  return 'winter'
}

// ════════════════════════════════════════════════════
//  时令诗句库（按季节分组）
//  原实现给每个城市硬编一句，且 6 城里 4 城是春诗 —— 与"时令"自相矛盾。
//  改为按季节取句：句句与当下时令相符，且保留城市漫游时的名篇韵味。
// ════════════════════════════════════════════════════
const SEASON_LINES = {
  spring: [
    { line: '春风得意马蹄疾，一日看尽长安花', author: '孟郊', title: '登科后', city: '西安' },
    { line: '竹外桃花三两枝，春江水暖鸭先知', author: '苏轼', title: '惠崇春江晚景', city: '惠州' },
    { line: '天街小雨润如酥，草色遥看近却无', author: '韩愈', title: '早春呈水部张十八员外', city: '西安' },
    { line: '好雨知时节，当春乃发生', author: '杜甫', title: '春夜喜雨', city: '成都' },
    { line: '烟花三月下扬州', author: '李白', title: '黄鹤楼送孟浩然之广陵', city: '扬州' },
    { line: '千里莺啼绿映红，水村山郭酒旗风', author: '杜牧', title: '江南春', city: '南京' },
    { line: '等闲识得东风面，万紫千红总是春', author: '朱熹', title: '春日', city: '杭州' },
    { line: '沾衣欲湿杏花雨，吹面不寒杨柳风', author: '志南', title: '绝句', city: '苏州' },
  ],
  summer: [
    { line: '接天莲叶无穷碧，映日荷花别样红', author: '杨万里', title: '晓出净慈寺送林子方', city: '杭州' },
    { line: '稻花香里说丰年，听取蛙声一片', author: '辛弃疾', title: '西江月·夜行黄沙道中', city: '上饶' },
    { line: '绿树阴浓夏日长，楼台倒影入池塘', author: '高骈', title: '山亭夏日', city: '扬州' },
    { line: '水晶帘动微风起，满架蔷薇一院香', author: '高骈', title: '山亭夏日', city: '苏州' },
    { line: '黄梅时节家家雨，青草池塘处处蛙', author: '赵师秀', title: '约客', city: '南京' },
    { line: '日长睡起无情思，闲看儿童捉柳花', author: '杨万里', title: '闲居初夏午睡起', city: '吉安' },
  ],
  autumn: [
    { line: '月落乌啼霜满天，江枫渔火对愁眠', author: '张继', title: '枫桥夜泊', city: '苏州' },
    { line: '洛阳城里见秋风，欲作家书意万重', author: '张籍', title: '秋思', city: '洛阳' },
    { line: '秋风生渭水，落叶满长安', author: '贾岛', title: '忆江上吴处士', city: '西安' },
    { line: '自古逢秋悲寂寥，我言秋日胜春朝', author: '刘禹锡', title: '秋词', city: '洛阳' },
    { line: '银烛秋光冷画屏，轻罗小扇扑流萤', author: '杜牧', title: '秋夕', city: '西安' },
    { line: '停车坐爱枫林晚，霜叶红于二月花', author: '杜牧', title: '山行', city: '长沙' },
    { line: '落霞与孤鹜齐飞，秋水共长天一色', author: '王勃', title: '滕王阁序', city: '南昌' },
    { line: '江南佳丽地，金陵帝王州', author: '谢朓', title: '入朝曲', city: '南京' },
  ],
  winter: [
    { line: '孤舟蓑笠翁，独钓寒江雪', author: '柳宗元', title: '江雪', city: '永州' },
    { line: '墙角数枝梅，凌寒独自开', author: '王安石', title: '梅花', city: '南京' },
    { line: '晚来天欲雪，能饮一杯无', author: '白居易', title: '问刘十九', city: '洛阳' },
    { line: '窗含西岭千秋雪，门泊东吴万里船', author: '杜甫', title: '绝句', city: '成都' },
    { line: '忽如一夜春风来，千树万树梨花开', author: '岑参', title: '白雪歌送武判官归京', city: '乌鲁木齐' },
    { line: '日暮苍山远，天寒白屋贫', author: '刘长卿', title: '逢雪宿芙蓉山主人', city: '长沙' },
  ],
}

/** 按当前季节取一句时令诗；若指定城市且有对应城市的句子则优先；无专属诗时优先选用无强烈异地地名色彩的普适名句 */
export function seasonLine(date = new Date(), cityName = '') {
  const list = SEASON_LINES[seasonKey(date)] || SEASON_LINES.spring
  if (cityName) {
    const hit = list.find((x) => x.city === cityName)
    if (hit) return hit
  }
  // 未命中专属城市时，过滤掉诗句中强硬出现其他地名（如金陵、长安、洛阳、苏州）的诗句，保证全国各地都顺理成章
  const generalList = list.filter((x) => {
    const hasOtherCityName = ['金陵', '长安', '洛阳', '姑苏', '江枫', '渭水'].some((k) => x.line.includes(k))
    return !hasOtherCityName
  })
  const pool = generalList.length > 0 ? generalList : list
  // 用日期做稳定散列，同一天内不变
  const d = date.getDate() + date.getMonth() * 31
  return pool[d % pool.length]
}

// ════════════════════════════════════════════════════
//  真实天气（Open-Meteo，免费无 Key）
// ════════════════════════════════════════════════════
// WMO Weather interpretation codes → 古风天气词
const WMO = {
  0: '晴明', 1: '晴间少云', 2: '云气渐生', 3: '阴云密布',
  45: '薄雾', 48: '雾凇凝霜',
  51: '细雨', 53: '微雨', 55: '密雨',
  56: '冻雨', 57: '冻雨',
  61: '小雨', 63: '中雨', 65: '大雨',
  66: '冻雨', 67: '冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
  80: '阵雨', 81: '阵雨', 82: '骤雨',
  85: '阵雪', 86: '阵雪',
  95: '雷雨', 96: '雷雨带雹', 99: '雷雨带雹',
}

/**
 * 取真实气温与天气。
 * @returns {Promise<{temp:number, tempText:string, weather:string}|null>} 失败返回 null（调用方降级）
 */
export async function fetchWeather(lat, lng, signal) {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
    '&current=temperature_2m,weather_code,is_day&timezone=Asia%2FShanghai'
  try {
    const res = await fetch(url, { signal })
    if (!res.ok) return null
    const j = await res.json()
    const temp = j?.current?.temperature_2m
    if (!Number.isFinite(temp)) return null
    const code = j?.current?.weather_code
    return {
      temp,
      tempText: `${Math.round(temp)}°`,
      weather: WMO[code] || '天象未详',
      isDay: j?.current?.is_day === 1,
    }
  } catch {
    // 网络失败 / 被中断：返回 null 让 UI 按降级呈现，不抛错
    return null
  }
}

// ════════════════════════════════════════════════════
//  定位：GPS → IP → 默认北京
// ════════════════════════════════════════════════════
function browserGeo(timeout = 6000) {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return resolve(null)
    let done = false
    const timer = setTimeout(() => { if (!done) { done = true; resolve(null) } }, timeout)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return
        done = true; clearTimeout(timer)
        resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' })
      },
      () => { if (!done) { done = true; clearTimeout(timer); resolve(null) } },
      { timeout, maximumAge: 600000, enableHighAccuracy: false },
    )
  })
}

// IP 归属地：按顺序尝试，任一成功即返回。
// 选型依据（2026-10-15 实测）：
//   ipwho.is  → HTTP 200，HTTPS，CORS:*          ✅ 首选
//   ipinfo.io → HTTP 200，HTTPS，CORS:*          ✅ 备用
//   ip-api.com→ HTTP 200，但仅 HTTP（HTTPS 需付费），移动端混合内容会被拦 → 不用
//   ipapi.co  → HTTP 403（Cloudflare 拦截）       ❌ 曾误用，已替换
const IP_PROVIDERS = [
  { url: 'https://ipwho.is/', parse: (j) => (j.success === false ? null : { lat: j.latitude, lng: j.longitude, city: j.city || '', region: j.region || '' }) },
  { url: 'https://ipinfo.io/json', parse: (j) => { const [la, ln] = String(j.loc || '').split(','); return { lat: Number(la), lng: Number(ln), city: j.city || '', region: j.region || '' } } },
]

async function ipGeo(signal) {
  for (const p of IP_PROVIDERS) {
    try {
      const res = await fetch(p.url, { signal })
      if (!res.ok) continue
      const parsed = p.parse(await res.json())
      if (!parsed) continue
      const lat = Number(parsed.lat), lng = Number(parsed.lng)
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
      return { lat, lng, city: parsed.city, region: parsed.region, source: 'ip' }
    } catch {
      // 换下一个服务；全部失败则由调用方走默认城市
    }
  }
  return null
}

/** 默认城市对象（北京） */
export function defaultCity() {
  const c = CITIES.find(([n]) => n === DEFAULT_CITY)
  if (c) return { name: c[0], province: c[1], lat: c[2], lng: c[3], ancient: c[4] || '' }
  const [name, province, lat, lng, ancient] = CITIES[0]
  return { name, province, lat, lng, ancient: ancient || '' }
}

/**
 * 按经纬度就近定位到收录城市。
 * IP 定位给的是城市中心坐标，与市级中心偏差可能达数公里，
 * 故再用 IP 返回的城市名在表里精确匹配一次，命中则优先用表内坐标。
 */
export function resolveCity(coords) {
  if (!coords) return defaultCity()
  if (coords.city) {
    const exact = CITIES.find(([n, , , , a]) => n === coords.city || a === coords.city)
    if (exact) return { name: exact[0], province: exact[1], lat: exact[2], lng: exact[3], ancient: exact[4] || '' }
  }
  return nearestCity(coords.lat, coords.lng) || defaultCity()
}

/**
 * 完整定位流程：GPS → IP → 北京
 * @returns {Promise<{city:object, source:'gps'|'ip'|'default'}>}
 */
export async function locate(signal) {
  const gps = await browserGeo()
  if (gps) return { city: resolveCity(gps), source: 'gps' }
  const ip = await ipGeo(signal)
  if (ip) return { city: resolveCity(ip), source: 'ip' }
  return { city: defaultCity(), source: 'default' }
}
