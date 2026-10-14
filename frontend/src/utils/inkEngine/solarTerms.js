// ════════════════════════════════════════════════════
//  二十四节气 · 太阳视黄经算法（纯天文计算，零硬编码表驱动）
//
//  原理：节气本质是太阳视黄经每 15° 的等分点
//    春分 = 0°，清明 = 15°，……，惊蛰 = 345°
//  故只要算出某时刻太阳视黄经 λ，即可反推所属节气，
//  无需任何手写日期对照表。
//
//  太阳视黄经（低精度版，精度约 0.01°，远高于节气判定需求）：
//    T  = 儒略世纪数
//    L0 = 280.46646° + 36000.76983°T + 0.0003032°T²      （几何平黄经）
//    M  = 357.52911° + 35999.05029°T − 0.0001537°T²      （平近点角）
//    C  = 中心差（含 3 个主要摄动项）
//    λ  = L0 + C − 0.00569° − 0.00478°·sin(Ω)            （视黄经，含章动与光行差）
// ════════════════════════════════════════════════════

const DEG = Math.PI / 180
const RAD = 180 / Math.PI

const norm360 = (deg) => ((deg % 360) + 360) % 360

/** 儒略日（UTC） */
export function julianDay(date) {
  return date.getTime() / 86400000 + 2440587.5
}

/** 太阳视黄经（度，0~360，春分附近为 0°） */
export function solarApparentLongitude(date) {
  const T = (julianDay(date) - 2451545.0) / 36525

  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  const Mr = M * DEG

  // 中心差
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mr) +
    0.000289 * Math.sin(3 * Mr)

  // 月球升交点黄经 → 章动修正
  const omega = 125.04 - 1934.136 * T
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * DEG)

  return norm360(lambda)
}

// 二十四节气名（按黄经 0° 起每 15° 递增排列）
export const SOLAR_TERMS = [
  '春分', '清明', '谷雨', '立夏', '小满', '芒种',
  '夏至', '小暑', '大暑', '立秋', '处暑', '白露',
  '秋分', '寒露', '霜降', '立冬', '小雪', '大雪',
  '冬至', '小寒', '大寒', '立春', '雨水', '惊蛰',
]

/** 节气索引：0=春分 … 23=惊蛰
 *  注意：节气边界是 15° 的整数倍，必须取【最近】边界而非向下取整 ——
 *  否则黄经 359.56°（春分前 0.44°）会被 floor 到 23（惊蛰），差一个节气。
 */
export function solarTermIndex(date) {
  const lon = norm360(solarApparentLongitude(date))
  return Math.round(lon / 15) % 24
}

export function solarTermName(date) {
  return SOLAR_TERMS[solarTermIndex(date)]
}

/** 距「下一个」节气还有多少天
 *  口径：从当前黄经到【严格大于当前值】的下一个 15° 边界。
 *  注意不能复用 solarTermIndex —— 它取最近边界（可能已在身后），
 *  而"下一个节气"必须取前方边界。
 */
export function daysToNextTerm(date) {
  const lon = norm360(solarApparentLongitude(date))
  const nextBoundary = (Math.floor(lon / 15) + 1) * 15
  const remainDeg = norm360(nextBoundary - lon)
  // 太阳黄经日均约 0.9856°
  return remainDeg / 0.9856
}

/**
 * 节气 → 季节段
 * 春：立春~立夏（黄经 315°~45°）  夏：立夏~立秋（45°~135°）
 * 秋：立秋~立冬（135°~225°）      冬：立冬~立春（225°~315°）
 */
export function seasonOf(date) {
  const lon = norm360(solarApparentLongitude(date))
  if (lon >= 315 || lon < 45) return 'spring'
  if (lon < 135) return 'summer'
  if (lon < 225) return 'autumn'
  return 'winter'
}

export const SEASON_LABEL = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' }

/**
 * 二十四节气 → 水墨意象（物候风物，非硬编码视觉，而是主题映射）
 * 每个节气给出：主色调、粒子形态倾向、风场性格
 */
const TERM_MOTIF = {
  春分: { motif: '花信', hue: '#C77A8E', wind: 1.0, fall: 'petal' },
  清明: { motif: '杏花微雨', hue: '#B98AA6', wind: 1.1, fall: 'petal' },
  谷雨: { motif: '新绿', hue: '#7FA663', wind: 1.0, fall: 'petal' },
  立夏: { motif: '新篁', hue: '#6FA05A', wind: 1.2, fall: 'leaf' },
  小满: { motif: '青麦', hue: '#8FB05E', wind: 1.3, fall: 'leaf' },
  芒种: { motif: '榴红', hue: '#B4553F', wind: 1.4, fall: 'leaf' },
  夏至: { motif: '荷风', hue: '#5E9E7A', wind: 1.2, fall: 'leaf' },
  小暑: { motif: '流萤', hue: '#D9C067', wind: 0.9, fall: 'glow' },
  大暑: { motif: '蝉声', hue: '#C9A227', wind: 0.8, fall: 'glow' },
  立秋: { motif: '梧叶', hue: '#C08A3E', wind: 1.3, fall: 'leaf' },
  处暑: { motif: '残荷', hue: '#A98A55', wind: 1.2, fall: 'leaf' },
  白露: { motif: '蒹葭', hue: '#C9C2A6', wind: 1.5, fall: 'leaf' },
  秋分: { motif: '桂子', hue: '#D4A537', wind: 1.4, fall: 'leaf' },
  寒露: { motif: '丹枫', hue: '#B4462F', wind: 1.6, fall: 'leaf' },
  霜降: { motif: '菊黄', hue: '#D9B44A', wind: 1.5, fall: 'leaf' },
  立冬: { motif: '寒烟', hue: '#9AA3A8', wind: 1.2, fall: 'leaf' },
  小雪: { motif: '初雪', hue: '#E8EDF0', wind: 1.1, fall: 'snow' },
  大雪: { motif: '琼芳', hue: '#F2F6F8', wind: 1.3, fall: 'snow' },
  冬至: { motif: '寒梅', hue: '#C46A6A', wind: 1.0, fall: 'snow' },
  小寒: { motif: '疏影', hue: '#B9C3C9', wind: 1.1, fall: 'snow' },
  大寒: { motif: '冰澌', hue: '#DCE4E8', wind: 1.2, fall: 'snow' },
  立春: { motif: '东风解冻', hue: '#8FAE8B', wind: 1.1, fall: 'petal' },
  雨水: { motif: '烟雨', hue: '#8EA9B8', wind: 1.0, fall: 'rain' },
  惊蛰: { motif: '春雷', hue: '#7E9E86', wind: 1.4, fall: 'petal' },
}

/**
 * 完整氛围状态：节气 + 黄经 + 季节 + 意象 + 粒子形态 + 风场参数
 * 这是"氛围随真实日期变化"的唯一真源
 */
export function atmosphere(date = new Date()) {
  const lon = solarApparentLongitude(date)
  const idx = solarTermIndex(date)
  const name = SOLAR_TERMS[idx]
  const season = seasonOf(date)
  const m = TERM_MOTIF[name] || { motif: '清和', hue: '#9AA79A', wind: 1.2, fall: 'leaf' }
  return {
    term: name,
    termIndex: idx,
    longitude: lon,
    season,
    seasonLabel: SEASON_LABEL[season],
    motif: m.motif,
    hue: m.hue,
    windScale: m.wind,
    fallStyle: m.fall,
    daysToNext: daysToNextTerm(date),
  }
}

/**
 * 节气 × 时段 → 粒子模式
 * 白昼落叶（或花瓣/雪）｜夜间流萤｜雨天涟漪
 */
export function particleMode(date, isDark) {
  const a = atmosphere(date)
  const hour = date.getHours()
  const isNight = isDark || hour >= 19 || hour < 6

  // 雨天：雨水节气 / 清明 / 谷雨 —— 触发涟漪
  const rainyTerm = ['雨水', '清明', '谷雨'].includes(a.term)
  if (rainyTerm) return { mode: 'rain', atmosphere: a }

  if (isNight) return { mode: 'firefly', atmosphere: a }
  return { mode: a.fallStyle === 'snow' ? 'snow' : a.fallStyle === 'rain' ? 'rain' : 'leaf', atmosphere: a }
}

/** 二十四节气全量（供 UI 展示黄经刻度） */
export function termTable(date = new Date()) {
  const lon = norm360(solarApparentLongitude(date))
  const cur = solarTermIndex(date)
  return SOLAR_TERMS.map((name, i) => ({
    name,
    longitude: i * 15,
    index: i,
    current: i === cur,
    // 自本节气边界起，太阳已走过的黄经（0~15°）
    progress: i === cur ? norm360(lon - i * 15) : 0,
  }))
}
