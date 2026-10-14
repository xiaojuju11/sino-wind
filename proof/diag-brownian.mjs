// 精确诊断：离散朗之万过程的方差与扩散系数，逐项对照解析式
import { createRandom, stepParticle, vec } from '../frontend/src/utils/inkEngine/physics.js'

const N = 4000
const dt = 1 / 60
const DRAG = 2.0
const BROWN = 60
const a = Math.exp(-DRAG * dt)
const sigma = BROWN

const mk = () => ({ pos: vec(0, 0), vel: vec(0, 0), radius: 1.5, mass: 1, phase: 0.123 })
const ps = Array.from({ length: N }, mk)
const env = { gravity: 0, drag: DRAG, wind: null, brownian: BROWN, buoyancy: 0, homeForce: 0, home: vec(), maxSpeed: 1e9, time: 0, random: createRandom(7) }

// ── ① 单步速度方差：只做一步，直接量 Δv 的方差 ──
{
  const dv = []
  for (let i = 0; i < 200000; i++) {
    const p = mk()
    const before = p.vel.x
    stepParticle(p, dt, env)
    dv.push(p.vel.x - before)
  }
  let m = 0
  let m2 = 0
  for (const v of dv) { m += v; m2 += v * v }
  m /= dv.length
  const varr = m2 / dv.length - m * m
  const theory = sigma * sigma * dt
  console.log('① 单步速度增量方差')
  console.log(`   实测 = ${varr.toFixed(4)}`)
  console.log(`   理论 σ²·dt = ${theory.toFixed(4)}`)
  console.log(`   比值 = ${(varr / theory).toFixed(4)}`)
}

// ── ② 稳态速度方差 ──
{
  for (let i = 0; i < 6000; i++) for (const p of ps) stepParticle(p, dt, env)
  let s = 0
  let s2 = 0
  for (const p of ps) { s += p.vel.x; s2 += p.vel.x * p.vel.x }
  const mean = s / N
  const varr = s2 / N - mean * mean
  const theory = (sigma * sigma * dt) / (1 - a * a)
  console.log('\n② 稳态速度方差 Var(v∞)')
  console.log(`   实测 = ${varr.toFixed(4)}`)
  console.log(`   理论 σ²dt/(1−a²) = ${theory.toFixed(4)}`)
  console.log(`   比值 = ${(varr / theory).toFixed(4)}`)
}

// ── ③ MSD 前置系数 C = MSD(n)/n（渐近）──
{
  for (const p of ps) { p.pos.x = 0; p.pos.y = 0; p.vel.x = 0; p.vel.y = 0 }
  const total = Math.round(8 / dt)
  const snaps = {}
  for (let i = 1; i <= total; i++) {
    for (const p of ps) stepParticle(p, dt, env)
    const t = i * dt
    if ([2, 4, 8].some((x) => Math.abs(t - x) < 1e-9)) {
      let s = 0
      for (const p of ps) s += p.pos.x * p.pos.x + p.pos.y * p.pos.y
      snaps[t] = s / N
    }
  }
  console.log('\n③ MSD 与渐近线性系数')
  const Ctheory = (sigma * sigma * dt) / (1 - a) ** 2 / 2
  for (const t of [2, 4, 8]) {
    const n = t / dt
    // 精确离散解归一化（无量纲形状）
    const shape = n - (a * (1 - Math.pow(a, n))) / (1 - a)
    const C_meas = snaps[t] / shape
    console.log(`   t=${t}s  MSD=${snaps[t].toFixed(1)}   C实测=${C_meas.toFixed(4)}`)
  }
  console.log(`   C理论 σ²dt/(2(1−a)²) = ${Ctheory.toFixed(4)}`)
  console.log(`   → 渐近 MSD ≈ 2·C·t ；2C = ${(2 * Ctheory).toFixed(3)}`)
}
