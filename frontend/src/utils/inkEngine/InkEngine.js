// ════════════════════════════════════════════════════
//  水墨流体粒子引擎 · 核心（Canvas 2D，60fps 目标）
//
//  架构：
//    引擎只管「物理 + 绘制」，不含任何 React / DOM 业务逻辑，
//    便于脱离浏览器做纯函数自测（见 proof/verify-ink-engine.mjs）。
//
//  四态粒子：
//    leaf    白昼落叶   —— 重力 + 空气阻尼 + 风向扰动 + 自旋翻转
//    petal   花瓣       —— 更轻、更吃风、飘忽打旋
//    snow    飞雪       —— 极低重力 + 高阻尼 + 强扰动（缓慢沉降）
//    firefly 夜萤       —— 布朗运动 + 回位力 + 浮力 + 呼吸辉光
//    rain    雨丝       —— 高速下坠，触地/触"水面"生成涟漪
//
//  交互：
//    · 手指划动 → 水墨扩散笔触（ink wash）+ 粒子躲避（法向排斥冲量）
//    · 笔触粒子本身也受重力/阻尼衰减，形成"墨滴下坠"的余韵
// ════════════════════════════════════════════════════
import {
  Pool,
  FrameMeter,
  addScaled,
  clamp,
  createRandom,
  gaussian,
  limitVec,
  repelFrom,
  sampleWind,
  stepParticle,
  stepRipple,
  vec,
} from './physics.js'
import { particleMode } from './solarTerms.js'

// ── 各粒子形态的物理参数（唯一调参入口）─────────────
const PRESETS = {
  leaf: {
    count: 16, gravity: 78, drag: 0.55, maxSpeed: 520, windGain: 1.0,
    size: [3.2, 6.4], brownian: 0, buoyancy: 0, homeForce: 0, spin: true,
    // 落叶色：赭石 / 丹枫 / 苍黄
    palette: ['#9E6B3A', '#B4462F', '#C9A227', '#7A6A48', '#8C5A34'],
    alpha: [0.55, 0.9],
  },
  petal: {
    count: 20, gravity: 26, drag: 0.85, maxSpeed: 380, windGain: 1.9,
    size: [2.4, 4.8], brownian: 0, buoyancy: 8, homeForce: 0, spin: true,
    palette: ['#C77A8E', '#D9A3B4', '#E3C6CE', '#B98AA6'],
    alpha: [0.5, 0.85],
  },
  snow: {
    count: 34, gravity: 9, drag: 1.05, maxSpeed: 240, windGain: 2.4,
    size: [1.4, 3.2], brownian: 6, buoyancy: 10, homeForce: 0, spin: true,
    palette: ['#FFFFFF', '#EAF1F4', '#D6E2E8'],
    alpha: [0.45, 0.9],
  },
  firefly: {
    count: 6, gravity: 0, drag: 0.42, maxSpeed: 160, windGain: 0.35,
    size: [0.6, 1.2], brownian: 35, buoyancy: 10, homeForce: 0.75, spin: false,
    palette: ['#F6E3A1', '#ECD38C', '#CEA559'],
    alpha: [0.25, 0.8],
  },
  rain: {
    // 雨滴数量直接决定帧成本（每滴一条短线 + 落水涟漪），移动端不宜过多
    count: 62, gravity: 620, drag: 0.08, maxSpeed: 1500, windGain: 0.5,
    size: [0.7, 1.5], brownian: 0, buoyancy: 0, homeForce: 0, spin: false,
    palette: ['#A9C2CE', '#8EA9B8', '#C6D6DE'],
    alpha: [0.25, 0.6],
  },
}

// 各模式统一叠加的"墨霭"粒子（让画面始终有水墨气韵）
const MIST = {
  count: 10, gravity: -2, drag: 0.22, maxSpeed: 60, windGain: 0.5,
  size: [26, 74], brownian: 2, buoyancy: 4, homeForce: 0, spin: false,
  palette: ['#8A8F86', '#A8A79C', '#6E736A'],
  alpha: [0.025, 0.07],
}

export class InkEngine {
  constructor(canvas, options = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d', { alpha: true })
    this.options = {
      interactive: true,
      minTargetFps: 50, // 低于此帧率自动降配
      maxDpr: 2,
      seed: 20261014,
      ...options,
    }

    this.random = createRandom(this.options.seed)
    this.pool = new Pool(() => this.createBlankParticle(), 64)

    this.particles = []
    this.mists = []
    this.ripples = []
    this.inkParticles = []
    this.brushTrail = []      // 手势轨迹点（用于绘制墨线）
    this.obstacles = []       // 粒子躲避的排斥点

    this.wind = vec(0, 0)
    this.windZero = vec(0, 0)
    this.env = {
      gravity: 78, drag: 0.55, wind: this.wind, brownian: 0, buoyancy: 0,
      homeForce: 0, home: vec(0, 0), maxSpeed: 600, time: 0, random: this.random,
    }
    this.impulse = vec(0, 0)

    this.time = 0
    this.frame = 0
    this.paused = false
    this.destroyed = false
    this.meter = new FrameMeter(120)
    this.fps = 60
    this.qualityScale = 1

    this.mode = 'leaf'
    this.atmosphere = null
    this.isDark = false
    // 雨天的"水面"高度：统一一条水位线，涟漪才符合物理（此前每滴各自随机，
    // 涟漪会散布在整页各高度 —— 那是错的）
    this.waterline = 0

    this.dpr = 1
    this.width = 0
    this.height = 0

    this.pointer = { active: false, x: 0, y: 0, lx: 0, ly: 0, speed: 0 }
    this.lastFrameTime = 0
    this.rafId = null

    this._boundLoop = this.loop.bind(this)
    this.resize()
  }

  // ── 生命周期 ──────────────────────────────────────
  start() {
    if (this.rafId != null || this.destroyed) return
    this.lastFrameTime = 0
    this.rafId = requestAnimationFrame(this._boundLoop)
  }

  stop() {
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  destroy() {
    this.destroyed = true
    this.stop()
    this.particles.length = 0
    this.mists.length = 0
    this.ripples.length = 0
    this.inkParticles.length = 0
    this.brushTrail.length = 0
    this.obstacles.length = 0
  }

  pause() {
    this.paused = true
  }

  resume() {
    this.paused = false
    this.lastFrameTime = 0
  }

  // ── 视口与自适应 ──────────────────────────────────
  resize() {
    const rect = this.canvas.getBoundingClientRect()
    const dpr = Math.min(window.devicePixelRatio || 1, this.options.maxDpr)
    this.dpr = dpr
    this.width = Math.max(1, Math.round(rect.width))
    this.height = Math.max(1, Math.round(rect.height))
    this.canvas.width = Math.round(this.width * dpr)
    this.canvas.height = Math.round(this.height * dpr)
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // 池化：窗口变化后重新铺满
    this.spawnInitial()
  }

  createBlankParticle() {
    return {
      kind: 'leaf',
      pos: vec(),
      vel: vec(),
      home: vec(),
      radius: 4,
      mass: 1,
      rotation: 0,
      spin: 0,
      phase: 0,
      life: 0,
      maxLife: 0,
      alpha: 0.7,
      color: '#9E6B3A',
      shape: 'leaf',
      groundY: 0,
      spawned: false,
    }
  }

  // ── 氛围设置 ──────────────────────────────────────
  /**
   * @param date Date（用于节气算法）
   * @param isDark 是否夜间主题
   * @param modeOverride 'auto' | 'leaf' | 'firefly' | 'rain' | 'snow' | 'petal'
   */
  setAtmosphere(date = new Date(), isDark = false, modeOverride = 'auto') {
    this.isDark = isDark
    const picked = particleMode(date, isDark)
    this.atmosphere = picked.atmosphere
    this.mode = modeOverride && modeOverride !== 'auto' ? modeOverride : picked.mode
    this.spawnInitial()
  }

  effectiveCount(preset) {
    // 面积权重：小屏少粒子（保帧率），大屏足量（保观感）
    const area = this.width * this.height
    const areaFactor = clamp(area / (390 * 844), 0.45, 2.6)
    return Math.max(4, Math.round(preset.count * areaFactor * this.qualityScale))
  }

  spawnInitial() {
    const preset = PRESETS[this.mode] || PRESETS.leaf
    const target = this.effectiveCount(preset)

    // 统一水位线：取画布下方 78% 处（墨色水面），所有雨滴在同一高度激起涟漪
    this.waterline = Math.round(this.height * 0.78)

    this.particles.length = 0
    for (let i = 0; i < target; i++) this.particles.push(this.spawnParticle(preset, true))

    const mistTarget = Math.round(MIST.count * clamp((this.width * this.height) / (390 * 844), 0.5, 1.8))
    this.mists.length = 0
    for (let i = 0; i < mistTarget; i++) this.mists.push(this.spawnMist())
  }

  spawnParticle(preset, initial = false) {
    const r = this.random
    const p = this.pool.obtain()
    const [sMin, sMax] = preset.size
    p.radius = sMin + r() * (sMax - sMin)
    p.mass = p.radius * p.radius * 0.09 + 0.35
    p.kind = this.mode
    p.phase = r() * Math.PI * 2
    p.rotation = r() * Math.PI * 2
    p.spin = (r() - 0.5) * 1.6
    p.alpha = preset.alpha[0] + r() * (preset.alpha[1] - preset.alpha[0])
    p.color = preset.palette[Math.floor(r() * preset.palette.length)]
    p.shape = preset.spin ? (this.mode === 'snow' ? 'flake' : 'leaf') : 'dot'
    p.maxLife = 0
    p.life = 0

    // 出生点：落叶/花瓣自上方随风入场；流萤在活动域内随机；雨自顶部
    if (this.mode === 'firefly') {
      p.home.x = r() * this.width
      // 避开中间核心卡片阅读区，主要在顶部远山竹梢(0.04~0.22)和底部渚岸水草(0.78~0.96)漫游
      p.home.y = r() > 0.45 ? this.height * (0.04 + r() * 0.18) : this.height * (0.78 + r() * 0.18)
      p.pos.x = p.home.x + (r() - 0.5) * 40
      p.pos.y = p.home.y + (r() - 0.5) * 40
      p.vel.x = (r() - 0.5) * 16
      p.vel.y = (r() - 0.5) * 16
    } else if (this.mode === 'rain') {
      p.pos.x = r() * (this.width + 120) - 60
      p.pos.y = -20 - r() * this.height * (initial ? 0.6 : 0.15)
      p.vel.x = (r() - 0.5) * 20
      p.vel.y = 260 + r() * 320
      p.home.x = p.pos.x
      p.home.y = this.waterline // 统一水位线（所有涟漪同一高度）
    } else {
      p.pos.x = r() * (this.width + 160) - 80
      p.pos.y = -30 - r() * (initial ? this.height : 120)
      p.vel.x = (r() - 0.5) * 30
      p.vel.y = 10 + r() * 40
      p.home.x = 0
      p.home.y = 0
    }

    // 环境配置（每粒子独立 home）
    p.home.x = this.mode === 'firefly' ? p.home.x : 0
    return p
  }

  spawnMist() {
    const r = this.random
    const p = this.createBlankParticle()
    p.kind = 'mist'
    p.radius = MIST.size[0] + r() * (MIST.size[1] - MIST.size[0])
    p.mass = p.radius * 0.05
    p.pos.x = r() * this.width
    p.pos.y = this.height * (0.1 + r() * 0.9)
    p.vel.x = (r() - 0.5) * 8
    p.vel.y = -2 - r() * 4
    p.alpha = MIST.alpha[0] + r() * (MIST.alpha[1] - MIST.alpha[0])
    p.color = MIST.palette[Math.floor(r() * MIST.palette.length)]
    p.phase = r() * Math.PI * 2
    return p
  }

  /** 回收离场粒子并补足 */
  recycle(preset) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]
      const out =
        p.pos.y > this.height + 80 ||
        p.pos.x < -220 ||
        p.pos.x > this.width + 220 ||
        (p.life > 0 && p.life > p.maxLife)
      if (out) {
        this.particles[i] = this.particles[this.particles.length - 1]
        this.particles.pop()
        this.pool.release(p)
      }
    }
    const target = this.effectiveCount(preset)
    while (this.particles.length < target) this.particles.push(this.spawnParticle(preset))
  }

  // ── 交互 API ──────────────────────────────────────
  pointerDown(x, y) {
    if (!this.options.interactive) return
    this.pointer.active = true
    this.pointer.x = x
    this.pointer.y = y
    this.pointer.lx = x
    this.pointer.ly = y
    this.brushTrail.length = 0
    this.brushTrail.push({ x, y, age: 0, r: 6 + this.random() * 5 })
    this.addObstacle(x, y, 46)
  }

  pointerMove(x, y) {
    if (!this.options.interactive || !this.pointer.active) return
    const dx = x - this.pointer.lx
    const dy = y - this.pointer.ly
    const dist = Math.hypot(dx, dy)
    this.pointer.speed = dist * 60 // 近似 px/s（按 60fps 估计，仅用于笔触粗细）

    // 沿轨迹插值补点：快速划动也不断线
    const steps = Math.max(1, Math.ceil(dist / 7))
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const px = this.pointer.lx + dx * t
      const py = this.pointer.ly + dy * t
      this.brushTrail.push({ x: px, y: py, age: 0, r: 5 + this.random() * 6 })
      // 墨滴粒子：溅出的小墨点
      if (steps > 1 && i % 2 === 0) this.spawnInkDrop(px, py)
      this.addObstacle(px, py, 40)
    }
    if (this.brushTrail.length > 200) this.brushTrail.splice(0, this.brushTrail.length - 200)

    this.pointer.lx = x
    this.pointer.ly = y
    this.pointer.x = x
    this.pointer.y = y
  }

  pointerUp() {
    this.pointer.active = false
  }

  addObstacle(x, y, radius) {
    this.obstacles.push({ x, y, radius, strength: 900, ttl: 0.55, life: 0 })
    if (this.obstacles.length > 48) this.obstacles.shift()
  }

  spawnInkDrop(x, y) {
    if (this.inkParticles.length > 90) return
    const r = this.random
    const p = this.createBlankParticle()
    p.kind = 'ink'
    p.radius = 1.4 + r() * 3.4
    p.mass = p.radius * 0.6
    p.pos.x = x + (r() - 0.5) * 12
    p.pos.y = y + (r() - 0.5) * 12
    p.vel.x = (r() - 0.5) * 90
    p.vel.y = (r() - 0.5) * 90 - 20
    p.alpha = 0.28 + r() * 0.34
    p.color = this.isDark ? '#D8DEE4' : '#2E2A24'
    p.shape = 'drop'
    this.inkParticles.push(p)
  }

  // ── 主循环 ────────────────────────────────────────
  loop(now) {
    if (this.destroyed) return
    this.rafId = requestAnimationFrame(this._boundLoop)
    if (this.paused) {
      this.lastFrameTime = now
      return
    }

    let dt = this.lastFrameTime ? (now - this.lastFrameTime) / 1000 : 1 / 60
    this.lastFrameTime = now
    // 后台标签页回来时 dt 会很大：夹紧，避免粒子瞬移
    dt = clamp(dt, 0, 1 / 20)
    if (dt <= 0) return

    this.meter.push(dt)
    this.frame++
    if (this.frame % 30 === 0) {
      this.fps = this.meter.stats().fps
      this.autoTune()
    }

    // 固定子步长积分：低帧率下物理仍然稳定
    const steps = dt > 1 / 45 ? 2 : 1
    const h = dt / steps
    for (let s = 0; s < steps; s++) this.update(h)

    this.render()
  }

  /** 帧率不足时降配（保 60fps 优先于观感） */
  autoTune() {
    if (this.fps < this.options.minTargetFps && this.qualityScale > 0.45) {
      this.qualityScale = Math.max(0.45, this.qualityScale - 0.15)
      const preset = PRESETS[this.mode] || PRESETS.leaf
      this.recycle(preset)
    } else if (this.fps > 58 && this.qualityScale < 1) {
      this.qualityScale = Math.min(1, this.qualityScale + 0.05)
    }
  }

  update(dt) {
    this.time += dt
    const preset = PRESETS[this.mode] || PRESETS.leaf

    // 风场：基础风向 + 低频湍流
    const dense = this.mode === 'rain' ? 0.12 : 0.22
    sampleWind(this.time, dense, 26 * (this.atmosphere?.windScale ?? 1) * preset.windGain, 0.55, this.wind)

    // 统一环境（供子步积分复用，避免每粒子建对象）
    const env = this.env
    env.gravity = preset.gravity
    env.drag = preset.drag
    env.brownian = preset.brownian
    env.buoyancy = preset.buoyancy
    env.homeForce = preset.homeForce
    env.maxSpeed = preset.maxSpeed
    env.time = this.time
    env.random = this.random

    // 障碍物老化
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      o.life += dt
      if (o.life > o.ttl) this.obstacles.splice(i, 1)
    }

    // ① 主粒子
    for (const p of this.particles) {
      env.home = p.home
      stepParticle(p, dt, env)

      // 粒子躲避：被手势排斥点推开
      for (const o of this.obstacles) {
        if (repelFrom(p, o, dt, this.impulse)) {
          addScaled(p.vel, this.impulse.x, this.impulse.y, 1)
        }
      }

      // 落叶/花瓣：落地后消失（雨滴另做涟漪）
      if (p.pos.y > this.height + 40) p.pos.y = this.height + 41
    }

    // ② 雨滴触水 → 涟漪（统一水位线，且需上一帧在水面之上，避免穿透时重复触发）
    if (this.mode === 'rain') {
      for (const p of this.particles) {
        const prevY = p.pos.y - p.vel.y * dt
        if (p.pos.y >= this.waterline && prevY < this.waterline) {
          this.addRipple(p.pos.x, this.waterline, p.radius)
          p.pos.y = -30 - this.random() * 60
          p.pos.x = this.random() * (this.width + 120) - 60
          p.vel.y = 260 + this.random() * 320
        } else if (p.pos.y > this.height + 40) {
          // 兜底：极端 dt 下直接穿过水位线时，重新入场
          p.pos.y = -30 - this.random() * 60
          p.pos.x = this.random() * (this.width + 120) - 60
        }
      }
    }

    // ③ 墨霭
    const mistEnv = { ...env, gravity: MIST.gravity, drag: MIST.drag, brownian: MIST.brownian, buoyancy: MIST.buoyancy, homeForce: 0, maxSpeed: MIST.maxSpeed }
    for (const m of this.mists) {
      stepParticle(m, dt, mistEnv)
      if (m.pos.y < -m.radius * 2) {
        m.pos.y = this.height + m.radius
        m.pos.x = this.random() * this.width
      }
      if (m.pos.x < -m.radius * 2) m.pos.x = this.width + m.radius
      if (m.pos.x > this.width + m.radius * 2) m.pos.x = -m.radius
    }

    // ④ 手势墨迹衰减
    for (let i = this.brushTrail.length - 1; i >= 0; i--) {
      this.brushTrail[i].age += dt
      if (this.brushTrail[i].age > 0.9) this.brushTrail.splice(i, 1)
    }

    // ⑤ 墨滴粒子
    for (let i = this.inkParticles.length - 1; i >= 0; i--) {
      const p = this.inkParticles[i]
      p.vel.y += 260 * dt          // 墨滴自身重力
      p.vel.x *= Math.exp(-1.6 * dt)
      p.vel.y *= Math.exp(-0.5 * dt)
      p.pos.x += p.vel.x * dt
      p.pos.y += p.vel.y * dt
      p.alpha -= 0.55 * dt
      if (p.alpha <= 0.01) this.inkParticles.splice(i, 1)
    }

    // ⑥ 涟漪
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      if (!stepRipple(this.ripples[i], dt)) this.ripples.splice(i, 1)
    }

    this.recycle(preset)
  }

  addRipple(x, y, radius) {
    if (this.ripples.length > 42) return
    this.ripples.push({
      x, y,
      radius: 0,
      maxRadius: 16 + radius * 9 + this.random() * 18,
      alpha: 0.5,
      age: 0,
      life: 1.1 + this.random() * 0.7,
    })
  }

  // ── 绘制 ──────────────────────────────────────────
  clear() {
    this.ctx.clearRect(0, 0, this.width, this.height)
  }

  render() {
    const ctx = this.ctx
    this.clear()

    // ① 墨霭（最底层，营造水墨氤氲）
    ctx.save()
    for (const m of this.mists) {
      const g = ctx.createRadialGradient(m.pos.x, m.pos.y, 0, m.pos.x, m.pos.y, m.radius)
      g.addColorStop(0, this.rgba(m.color, m.alpha))
      g.addColorStop(1, this.rgba(m.color, 0))
      ctx.fillStyle = g
      ctx.beginPath()
      ctx.arc(m.pos.x, m.pos.y, m.radius, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.restore()

    // ② 涟漪（雨天）
    if (this.ripples.length) {
      ctx.save()
      ctx.lineWidth = 1
      for (const r of this.ripples) {
        ctx.strokeStyle = this.rgba(this.isDark ? '#AFC6D4' : '#6E7C86', r.alpha * 0.5)
        ctx.beginPath()
        ctx.ellipse(r.x, r.y, r.radius, r.radius * 0.34, 0, 0, Math.PI * 2)
        ctx.stroke()
        // 内圈：水波干涉的第二道纹
        if (r.radius > 8) {
          ctx.strokeStyle = this.rgba(this.isDark ? '#AFC6D4' : '#6E7C86', r.alpha * 0.24)
          ctx.beginPath()
          ctx.ellipse(r.x, r.y, r.radius * 0.55, r.radius * 0.19, 0, 0, Math.PI * 2)
          ctx.stroke()
        }
      }
      ctx.restore()
    }

    // ③ 手势水墨笔触（扩散渲染）
    if (this.brushTrail.length > 1) {
      ctx.save()
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      for (let i = 1; i < this.brushTrail.length; i++) {
        const a = this.brushTrail[i - 1]
        const b = this.brushTrail[i]
        const fade = 1 - b.age / 0.9
        const w = b.r * (0.5 + fade * 0.8)
        ctx.strokeStyle = this.rgba(this.isDark ? '#C9D3DB' : '#3A332A', 0.12 * fade)
        ctx.lineWidth = w * 1.9
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
        ctx.strokeStyle = this.rgba(this.isDark ? '#E4EBF0' : '#23201B', 0.2 * fade)
        ctx.lineWidth = w * 0.7
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }
      ctx.restore()
    }

    // ④ 墨滴粒子
    for (const p of this.inkParticles) {
      ctx.fillStyle = this.rgba(p.color, p.alpha)
      ctx.beginPath()
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2)
      ctx.fill()
    }

    // ⑤ 主粒子
    for (const p of this.particles) {
      if (p.kind === 'firefly') this.drawFirefly(ctx, p)
      else if (p.kind === 'rain') this.drawRain(ctx, p)
      else if (p.shape === 'flake') this.drawSnow(ctx, p)
      else this.drawLeaf(ctx, p)
    }
  }

  drawLeaf(ctx, p) {
    ctx.save()
    ctx.translate(p.pos.x, p.pos.y)
    ctx.rotate(p.rotation)
    // 侧视翻转：用 scaleX 随自旋压缩，模拟叶片翻面
    const flip = Math.cos(p.phase + p.rotation * 1.7)
    ctx.scale(flip, 1)
    ctx.fillStyle = this.rgba(p.color, p.alpha)
    ctx.beginPath()
    const r = p.radius
    // 柳叶形：两段二次贝塞尔
    ctx.moveTo(0, -r * 2.1)
    ctx.quadraticCurveTo(r * 0.95, 0, 0, r * 2.1)
    ctx.quadraticCurveTo(-r * 0.95, 0, 0, -r * 2.1)
    ctx.fill()
    // 叶脉
    ctx.strokeStyle = this.rgba('#000000', p.alpha * 0.16)
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, -r * 1.7)
    ctx.lineTo(0, r * 1.7)
    ctx.stroke()
    ctx.restore()
  }

  drawSnow(ctx, p) {
    const r = p.radius
    ctx.fillStyle = this.rgba(p.color, p.alpha)
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, r, 0, Math.PI * 2)
    ctx.fill()
    // 六出冰花：仅对较大的雪花画芒，省性能
    if (r > 2.4) {
      ctx.strokeStyle = this.rgba(p.color, p.alpha * 0.5)
      ctx.lineWidth = 0.6
      for (let i = 0; i < 3; i++) {
        const a = p.rotation + (i * Math.PI) / 3
        ctx.beginPath()
        ctx.moveTo(p.pos.x - Math.cos(a) * r * 1.8, p.pos.y - Math.sin(a) * r * 1.8)
        ctx.lineTo(p.pos.x + Math.cos(a) * r * 1.8, p.pos.y + Math.sin(a) * r * 1.8)
        ctx.stroke()
      }
    }
  }

  drawRain(ctx, p) {
    // 雨丝：沿速度方向拉长
    const len = clamp(Math.hypot(p.vel.x, p.vel.y) * 0.045, 5, 26)
    const ang = Math.atan2(p.vel.y, p.vel.x)
    ctx.save()
    ctx.translate(p.pos.x, p.pos.y)
    ctx.rotate(ang)
    ctx.strokeStyle = this.rgba(p.color, p.alpha)
    ctx.lineWidth = p.radius
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-len, 0)
    ctx.lineTo(0, 0)
    ctx.stroke()
    ctx.restore()
  }

  drawFirefly(ctx, p) {
    // 呼吸辉光：幽微柔和金芒，不刺眼（每只萤火虫频率与相位错落）
    const breathe = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(this.time * 2.1 + p.phase * 3.1))
    const a = p.alpha * breathe * 0.72
    const R = p.radius * 2.6
    const g = ctx.createRadialGradient(p.pos.x, p.pos.y, 0, p.pos.x, p.pos.y, R)
    g.addColorStop(0, this.rgba('#FFF9DF', a * 0.85))
    g.addColorStop(0.38, this.rgba(p.color, a * 0.4))
    g.addColorStop(1, this.rgba(p.color, 0))
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, R, 0, Math.PI * 2)
    ctx.fill()
    // 虫体核心（微小星点）
    ctx.fillStyle = this.rgba('#FFFDF0', Math.min(1, a * 1.1))
    ctx.beginPath()
    ctx.arc(p.pos.x, p.pos.y, p.radius * 0.55, 0, Math.PI * 2)
    ctx.fill()
  }

  // ── 颜色工具：hex → rgba（避免重复解析，做小缓存）──
  rgba(hex, alpha) {
    if (!this._colorCache) this._colorCache = new Map()
    let rgb = this._colorCache.get(hex)
    if (!rgb) {
      const h = hex.replace('#', '')
      const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
      rgb = [
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16),
      ]
      this._colorCache.set(hex, rgb)
    }
    return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${clamp(alpha, 0, 1).toFixed(3)})`
  }

  /** 运行指标（供 60fps 验收自证） */
  metrics() {
    const s = this.meter.stats()
    return {
      fps: Math.round(s.fps * 10) / 10,
      frameMsAvg: Math.round(s.avg * 100) / 100,
      frameMsP95: Math.round(s.p95 * 100) / 100,
      frameMsWorst: Math.round(s.min * 100) / 100,
      particles: this.particles.length,
      mists: this.mists.length,
      ripples: this.ripples.length,
      inkParticles: this.inkParticles.length,
      obstacles: this.obstacles.length,
      brushPoints: this.brushTrail.length,
      pointerActive: this.pointer.active,
      mode: this.mode,
      term: this.atmosphere?.term || null,
      season: this.atmosphere?.season || null,
      qualityScale: Math.round(this.qualityScale * 100) / 100,
      samples: s.samples,
    }
  }
}

/** 粒子运动学离线步进（供 Node 端纯函数自测，不依赖浏览器） */
export function stepKinematics(particles, steps, dt, env) {
  for (let s = 0; s < steps; s++) {
    for (const p of particles) {
      const e = { ...env, home: p.home || { x: 0, y: 0 }, random: env.random || Math.random }
      stepParticle(p, dt, e)
    }
  }
  return particles
}

export { PRESETS, MIST, gaussian, limitVec }
