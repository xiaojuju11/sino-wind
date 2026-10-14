// ════════════════════════════════════════════════════
//  水墨流体粒子引擎 · 物理内核（无依赖、纯数学）
//
//  设计要点：
//  ① 向量运算全部手写（不引第三方库），单位统一为「像素/秒」，
//     积分用半隐式欧拉 + 子步长，保证 60fps 与低帧率下行为一致；
//  ② 力模型：重力 g（向下）+ 空气阻尼（与速度成正比，指数衰减）
//     + 风向扰动向量（基础风 + 低频湍流噪声，随风场相位演进）；
//  ③ 布朗运动：流萤用「每帧高斯随机冲量 + 向心回位力」实现
//     真正的随机游走（均方位移 ∝ 时间），而非关键帧假动。
// ════════════════════════════════════════════════════

// ── 标量工具 ────────────────────────────────────────
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a, b, t) => a + (b - a) * t
/** 帧率无关的指数趋近系数：dt 变化时结果一致 */
export const damp = (rate, dt) => 1 - Math.exp(-rate * dt)

/**
 * 确定性伪随机（mulberry32）
 * 便于回放与自查：同一 seed 得到同一粒子布局
 */
export function createRandom(seed = 20261014) {
  let a = seed >>> 0
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller：标准正态分布（布朗运动需要高斯增量） */
export function gaussian(random) {
  let u = 0
  let v = 0
  while (u === 0) u = random()
  while (v === 0) v = random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

// ── 二维向量（就地修改，避免 GC 抖动 → 60fps 的关键）──
export const vec = (x = 0, y = 0) => ({ x, y })

export function setVec(v, x, y) {
  v.x = x
  v.y = y
  return v
}

export function addScaled(v, ax, ay, s) {
  v.x += ax * s
  v.y += ay * s
  return v
}

/** 限制向量长度 */
export function limitVec(v, max) {
  const len2 = v.x * v.x + v.y * v.y
  if (len2 > max * max) {
    const k = max / Math.sqrt(len2)
    v.x *= k
    v.y *= k
  }
  return v
}

/**
 * 湍流风场：多个低频正弦叠加，模拟自然的阵风起伏
 * 返回一个随时间缓变的风向单位向量 × 强度
 */
export function sampleWind(t, baseDir, baseSpeed, gustiness, out) {
  const s1 = Math.sin(t * 0.21) * 0.6
  const s2 = Math.sin(t * 0.47 + 1.7) * 0.3
  const s3 = Math.sin(t * 0.93 + 3.1) * 0.1
  const gust = 1 + gustiness * (s1 + s2 + s3)
  const angle = baseDir + 0.35 * Math.sin(t * 0.13) + 0.12 * Math.sin(t * 0.55 + 2.2)
  out.x = Math.cos(angle) * baseSpeed * gust
  out.y = Math.sin(angle) * baseSpeed * gust * 0.45
  return out
}

/**
 * 空气阻尼：v *= exp(-k·dt)
 * 与质量无关的简化模型，等价于线性空气阻力在小 dt 下的解
 */
export function applyDrag(v, k, dt) {
  const f = Math.exp(-k * dt)
  v.x *= f
  v.y *= f
  return v
}

/**
 * 单个粒子的步进（半隐式欧拉）
 * @param p  粒子（含 pos/vel/radius/mass/seedPhase）
 * @param dt 步长（秒）
 * @param env { gravity, drag, wind{x,y}, buoyancy, brownian, homeForce, home{x,y} }
 */
export function stepParticle(p, dt, env) {
  const { pos, vel } = p
  const invMass = 1 / (p.mass || 1)

  // ① 重力
  if (env.gravity) vel.y += env.gravity * dt

  // ② 风向扰动（含每粒子相位差，避免整齐划一 —— 水墨讲究"错落"）
  if (env.wind) {
    const airFactor = 1 / (0.6 + p.radius * 0.9) // 轻小粒子更吃风
    const flutter = 1 + 0.5 * Math.sin(p.phase + env.time * 2.1)
    addScaled(vel, env.wind.x * flutter * airFactor * invMass, env.wind.y * flutter * airFactor * invMass, dt)
  }

  // ③ 布朗运动（高斯随机冲量）—— 流萤夜间游走的核心
  if (env.brownian) {
    const g = env.brownian * invMass * Math.sqrt(dt) // √dt 缩放置信区间，保证扩散行为正确
    addScaled(vel, gaussian(env.random) * g, gaussian(env.random) * g, 1)
  }

  // ④ 回位力（把粒子轻柔拉回自己的活动域，如流萤绕草丛）
  if (env.homeForce && env.home) {
    addScaled(vel, env.home.x - pos.x, env.home.y - pos.y, env.homeForce * dt)
  }

  // ⑤ 浮力（流萤/雾滴抵抗重力）
  if (env.buoyancy) vel.y -= env.buoyancy * dt

  // ⑥ 空气阻尼
  applyDrag(vel, env.drag, dt)

  // ⑦ 限速（防数值爆炸 + 防止穿模）
  limitVec(vel, env.maxSpeed || 2400)

  // ⑧ 积分
  pos.x += vel.x * dt
  pos.y += vel.y * dt

  // ⑨ 角速度（叶子翻转）：角速度也吃阻尼，受风力轻微激励
  if (p.spin !== undefined) {
    if (env.wind) p.spin += (Math.abs(env.wind.x) * 0.00035 + 0.0008) * Math.sin(p.phase + env.time) * dt * 60
    p.spin *= Math.exp(-0.6 * dt)
    p.rotation += p.spin * dt
  }
  return p
}

// ── 障碍物交互（粒子躲避）──────────────────────────
/**
 * 手指划动时生成的"排斥点"：粒子沿法线被推开
 * @param p    粒子
 * @param obs  障碍 { x, y, radius, strength }
 * @param dt   步长
 * @param out  输出冲量（就地）
 */
export function repelFrom(p, obs, dt, out) {
  const dx = p.pos.x - obs.x
  const dy = p.pos.y - obs.y
  const dist2 = dx * dx + dy * dy
  const rr = obs.radius + p.radius
  if (dist2 > rr * rr || dist2 < 1e-6) {
    out.x = 0
    out.y = 0
    return false
  }
  const dist = Math.sqrt(dist2)
  const nx = dx / dist
  const ny = dy / dist
  // 越近推力越强（1 - d/r 的三次方 → 手感更"弹"）
  const falloff = 1 - dist / rr
  const push = obs.strength * falloff * falloff * falloff * dt
  out.x = nx * push
  out.y = ny * push
  return true
}

// ── 雨滴涟漪 ────────────────────────────────────────
/**
 * 涟漪：半径按 sqrt(t) 扩散（真实水波为扩散过程），透明度线性衰减
 */
export function stepRipple(r, dt) {
  r.age += dt
  r.radius = r.maxRadius * Math.sqrt(clamp(r.age / r.life, 0, 1))
  r.alpha = 1 - r.age / r.life
  return r.age < r.life
}

// ── 简易对象池（避免每帧 new，稳住 60fps）──────────
export class Pool {
  constructor(factory, size = 0) {
    this.factory = factory
    this.free = []
    for (let i = 0; i < size; i++) this.free.push(factory())
  }

  obtain() {
    return this.free.pop() || this.factory()
  }

  release(obj) {
    if (this.free.length < 512) this.free.push(obj)
  }
}

// ── 帧率统计（用于 60fps 验收自证）──────────────────
export class FrameMeter {
  constructor(windowSize = 120) {
    this.samples = new Float32Array(windowSize)
    this.size = windowSize
    this.idx = 0
    this.count = 0
  }

  push(dtSeconds) {
    this.samples[this.idx] = dtSeconds
    this.idx = (this.idx + 1) % this.size
    if (this.count < this.size) this.count++
  }

  /** 取窗口内 fps 统计（不要用单帧倒数，抖动太大） */
  stats() {
    if (!this.count) return { fps: 0, avg: 0, p95: 0, min: 0, samples: 0 }
    const arr = Array.from(this.samples.slice(0, this.count)).sort((a, b) => a - b)
    let sum = 0
    for (const v of arr) sum += v
    const avg = sum / arr.length
    const p95 = arr[Math.min(arr.length - 1, Math.floor(arr.length * 0.95))]
    return {
      fps: avg > 0 ? 1 / avg : 0,
      avg: avg * 1000,
      p95: p95 * 1000,
      min: arr[arr.length - 1] * 1000,
      samples: arr.length,
    }
  }
}
