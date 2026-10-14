// ════════════════════════════════════════════════════
//  五维雷达图 · 极坐标几何（纯数学，无 DOM，可单测）
//
//  极坐标 → 直角坐标：
//    θᵢ = −π/2 + 2π·i/n       （i=0 起于正上方，顺时针排列）
//    rᵢ = R · (scoreᵢ / 100)
//    xᵢ = cx + rᵢ·cos θᵢ
//    yᵢ = cy + rᵢ·sin θᵢ
//
//  多边形面积（用于自检"分数越高面积越大"）：
//    A = ½·|Σ(xᵢ·yᵢ₊₁ − xᵢ₊₁·yᵢ)|
// ════════════════════════════════════════════════════

/** 角度序列：自正上方开始顺时针 */
export function axisAngles(n) {
  return Array.from({ length: n }, (_, i) => -Math.PI / 2 + (2 * Math.PI * i) / n)
}

/** 单点极坐标 → 直角坐标 */
export function polarPoint(cx, cy, radius, angle) {
  return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }
}

/**
 * 由分数数组生成多边形顶点
 * @param scores number[] 0~100
 */
export function polygonPoints(scores, { cx, cy, maxRadius }) {
  const angles = axisAngles(scores.length)
  return scores.map((s, i) => polarPoint(cx, cy, maxRadius * (clamp01(s / 100)), angles[i]))
}

/** 网格环（第 level 层，共 levels 层） */
export function ringPoints(n, level, levels, { cx, cy, maxRadius }) {
  const angles = axisAngles(n)
  const r = maxRadius * (level / levels)
  return angles.map((a) => polarPoint(cx, cy, r, a))
}

/** 顶点数组 → SVG polygon 的 points 字符串 */
export function toPointString(points) {
  return points.map((p) => `${round2(p.x)},${round2(p.y)}`).join(' ')
}

/** 多边形面积（鞋带公式） */
export function polygonArea(points) {
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const a = points[i]
    const b = points[(i + 1) % points.length]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** 平滑折线路径（Catmull-Rom → 三次贝塞尔），让轮廓有"水墨圆融"感 */
export function smoothClosedPath(points, tension = 0.5) {
  const n = points.length
  if (n < 3) return ''
  const pt = (i) => points[((i % n) + n) % n]
  let d = `M ${round2(pt(0).x)} ${round2(pt(0).y)}`
  for (let i = 0; i < n; i++) {
    const p0 = pt(i - 1)
    const p1 = pt(i)
    const p2 = pt(i + 1)
    const p3 = pt(i + 2)
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2
    d += ` C ${round2(c1x)} ${round2(c1y)}, ${round2(c2x)} ${round2(c2y)}, ${round2(p2.x)} ${round2(p2.y)}`
  }
  return d + ' Z'
}

/**
 * 弹性形变插值（阻尼弹簧积分）
 * 用于切换诗词时的"平滑弹性形变"——不是单纯线性 tween，
 * 而是欠阻尼弹簧：会略微过冲再回稳，即"弹性"。
 *
 * 解：x'' = -k(x - target) - c·x'
 * 半隐式欧拉，dt 固定步长以保稳定
 */
export function createSpring(initial, { stiffness = 120, damping = 16 } = {}) {
  let value = initial
  let velocity = 0
  return {
    get value() {
      return value
    },
    get velocity() {
      return velocity
    },
    /** 前进 dt 秒，逼近 target */
    step(target, dt) {
      const steps = Math.max(1, Math.ceil(dt / (1 / 120))) // 固定子步长
      const h = dt / steps
      for (let i = 0; i < steps; i++) {
        const accel = -stiffness * (value - target) - damping * velocity
        velocity += accel * h
        value += velocity * h
      }
      return value
    },
    /** 是否已基本静止 */
    settled(target, eps = 0.05) {
      return Math.abs(value - target) < eps && Math.abs(velocity) < eps
    },
    reset(v) {
      value = v
      velocity = 0
    },
    /** 弹射：给一个初速度（让形变更有"甩出去"的手感） */
    kick(v) {
      velocity += v
    },
  }
}

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v)
const round2 = (v) => Math.round(v * 100) / 100

/**
 * 分数 → 雷达图完整几何（一次性给出所有层，供组件直接渲染）
 */
export function radarGeometry(scores, { size = 240, padding = 34, levels = 4 } = {}) {
  const cx = size / 2
  const cy = size / 2
  const maxRadius = size / 2 - padding
  const n = scores.length
  const angles = axisAngles(n)

  const rings = Array.from({ length: levels }, (_, i) =>
    toPointString(ringPoints(n, i + 1, levels, { cx, cy, maxRadius })),
  )
  const spokes = angles.map((a) => {
    const p = polarPoint(cx, cy, maxRadius, a)
    return { x1: cx, y1: cy, x2: round2(p.x), y2: round2(p.y) }
  })
  const points = polygonPoints(scores, { cx, cy, maxRadius })
  const labelRadius = maxRadius + padding * 0.62
  const labelAnchors = angles.map((a, i) => {
    const p = polarPoint(cx, cy, labelRadius, a)
    const cos = Math.cos(a)
    const anchor = Math.abs(cos) < 0.2 ? 'middle' : cos > 0 ? 'start' : 'end'
    return { x: round2(p.x), y: round2(p.y), anchor, index: i }
  })

  return {
    size, cx, cy, maxRadius, levels, n, angles,
    rings, spokes, points, labelAnchors,
    pointString: toPointString(points),
    path: smoothClosedPath(points),
    area: polygonArea(points),
  }
}
