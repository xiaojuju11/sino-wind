// ════════════════════════════════════════════════════
//  水墨流体粒子引擎 · 纯函数自测（Node 端，零依赖、零浏览器）
//  用法：node proof/verify-ink-engine.mjs
//
//  验证目标（对齐任务书「真算法」要求）：
//   ① 节气算法：太阳视黄经 → 二十四节气，拿已知节气日期证伪
//   ② 物理引擎：重力 / 空气阻尼 / 风向扰动 三条力各自可测
//   ③ 布朗运动：均方位移 MSD ∝ t（真随机游走，而非关键帧）
//   ④ 粒子躲避：排斥冲量方向沿法线、距离越近越强
//   ⑤ 涟漪：半径按 √t 扩散
//   ⑥ 帧率无关性：不同 dt 下积分结果一致（半隐式欧拉 + 子步长）
// ════════════════════════════════════════════════════
import {
  applyDrag,
  createRandom,
  damp,
  gaussian,
  limitVec,
  repelFrom,
  sampleWind,
  stepParticle,
  stepRipple,
  vec,
} from '../frontend/src/utils/inkEngine/physics.js'
import {
  SOLAR_TERMS,
  atmosphere,
  daysToNextTerm,
  particleMode,
  seasonOf,
  solarApparentLongitude,
  solarTermIndex,
  solarTermName,
  termTable,
} from '../frontend/src/utils/inkEngine/solarTerms.js'

let pass = 0
let fail = 0
const results = []

function check(name, ok, detail = '') {
  results.push({ name, ok, detail })
  if (ok) pass++
  else fail++
  const mark = ok ? '✅' : '❌'
  console.log(`${mark} ${name}${detail ? '  → ' + detail : ''}`)
}

const near = (a, b, tol) => Math.abs(a - b) <= tol

// ════════════════════════════════════════════════════
console.log('\n=== ① 二十四节气 · 太阳视黄经算法 ===')
// ════════════════════════════════════════════════════
// 春分应在 3/20 前后（黄经 0°）
const chunfen = new Date('2026-03-20T12:00:00+08:00')
const lonCF = solarApparentLongitude(chunfen)
check('春分 3/20 视黄经 ≈ 0°', lonCF < 1.2 || lonCF > 358.8, `实测 ${lonCF.toFixed(2)}°`)
check('春分节气名 = 春分', solarTermName(chunfen) === '春分', solarTermName(chunfen))

// 夏至应在 6/21 前后（黄经 90°）
const xiazhi = new Date('2026-06-21T12:00:00+08:00')
const lonXZ = solarApparentLongitude(xiazhi)
check('夏至 6/21 视黄经 ≈ 90°', near(lonXZ, 90, 1.5), `实测 ${lonXZ.toFixed(2)}°`)
check('夏至节气名 = 夏至', solarTermName(xiazhi) === '夏至', solarTermName(xiazhi))

// 秋分应在 9/23 前后（黄经 180°）
const qiufen = new Date('2026-09-23T12:00:00+08:00')
const lonQF = solarApparentLongitude(qiufen)
check('秋分 9/23 视黄经 ≈ 180°', near(lonQF, 180, 1.5), `实测 ${lonQF.toFixed(2)}°`)

// 冬至应在 12/22 前后（黄经 270°）
const dongzhi = new Date('2026-12-22T12:00:00+08:00')
const lonDZ = solarApparentLongitude(dongzhi)
check('冬至 12/22 视黄经 ≈ 270°', near(lonDZ, 270, 1.5), `实测 ${lonDZ.toFixed(2)}°`)

// 全量 24 节气名齐备且无重复
check('二十四节气名齐备', SOLAR_TERMS.length === 24 && new Set(SOLAR_TERMS).size === 24, `${SOLAR_TERMS.length} 个`)
// 索引 ↔ 名称一致性
let idxOk = true
for (let i = 0; i < 24; i++) {
  const d = new Date(chunfen.getTime() + i * 15.2 * 86400000)
  if (SOLAR_TERMS[solarTermIndex(d)] !== solarTermName(d)) idxOk = false
}
check('节气索引与名称自洽', idxOk)
// 季节判定
check('春分属春', seasonOf(chunfen) === 'spring', seasonOf(chunfen))
check('夏至属夏', seasonOf(xiazhi) === 'summer', seasonOf(xiazhi))
check('秋分属秋', seasonOf(qiufen) === 'autumn', seasonOf(qiufen))
check('冬至属冬', seasonOf(dongzhi) === 'winter', seasonOf(dongzhi))
// 距下一节气天数应在 0~15.2 之间
check('距下一节气天数 ∈ (0, 15.3)', daysToNextTerm(chunfen) > 0 && daysToNextTerm(chunfen) < 15.3, `${daysToNextTerm(chunfen).toFixed(2)} 天`)
// 氛围对象完整
const atm = atmosphere(chunfen)
check('氛围对象字段完整', !!(atm.term && atm.season && atm.motif && atm.hue && atm.windScale), `${atm.term}/${atm.motif}/风${atm.windScale}`)
// 节气表 24 项且恰有一项 current
const tt = termTable(chunfen)
check('节气表 24 项且仅一项 current', tt.length === 24 && tt.filter((t) => t.current).length === 1)
// 粒子模式：夜间应给流萤、雨水节气应给雨
check('夜间模式 → 流萤', particleMode(new Date('2026-07-10T22:00:00+08:00'), false).mode === 'firefly')
check('雨水节气 → 烟雨', particleMode(new Date('2026-02-19T10:00:00+08:00'), false).mode === 'rain')
check('大雪节气白昼 → 飞雪', particleMode(new Date('2026-12-07T10:00:00+08:00'), false).mode === 'snow')

// ════════════════════════════════════════════════════
console.log('\n=== ② 物理引擎 · 三条力独立可测 ===')
// ════════════════════════════════════════════════════
const rnd = createRandom(42)
const baseEnv = {
  gravity: 0, drag: 0, wind: null, brownian: 0, buoyancy: 0,
  homeForce: 0, home: vec(), maxSpeed: 1e9, time: 0, random: rnd,
}

// 重力：仅开重力，1 秒后 vy 应 ≈ g·t，位移 ≈ ½g t²（半隐式欧拉为 ½g t²+½g t dt）
{
  const p = { pos: vec(0, 0), vel: vec(0, 0), radius: 3, mass: 1, phase: 0 }
  const env = { ...baseEnv, gravity: 100 }
  const dt = 1 / 240
  for (let i = 0; i < 240; i++) stepParticle(p, dt, env)
  check('重力：vy ≈ g·t', near(p.vel.y, 100, 0.5), `vy=${p.vel.y.toFixed(2)} (期望 100)`)
  check('重力：位移向下且 ≈ ½gt²', p.pos.y > 49 && p.pos.y < 51, `y=${p.pos.y.toFixed(2)} (期望≈50)`)
}

// 无重力时：静止粒子不应自行移动
{
  const p = { pos: vec(5, 5), vel: vec(0, 0), radius: 3, mass: 1, phase: 0 }
  for (let i = 0; i < 120; i++) stepParticle(p, 1 / 120, baseEnv)
  check('无力场：粒子保持静止', near(p.pos.x, 5, 1e-9) && near(p.pos.y, 5, 1e-9))
}

// 空气阻尼：指数衰减 v(t) = v0·e^{-kt}
{
  const v = vec(100, 0)
  const k = 2
  const dt = 1 / 500
  for (let i = 0; i < 500; i++) applyDrag(v, k, dt)
  const expect = 100 * Math.exp(-k * 1)
  check('空气阻尼：v(1s) = v0·e^{-kt}', near(v.x, expect, 0.05), `${v.x.toFixed(4)} vs ${expect.toFixed(4)}`)

  // 阻尼的帧率无关性：大 dt 少步 vs 小 dt 多步，结果应一致
  const a = vec(100, 0)
  for (let i = 0; i < 60; i++) applyDrag(a, k, 1 / 60)
  const b = vec(100, 0)
  for (let i = 0; i < 600; i++) applyDrag(b, k, 1 / 600)
  check('阻尼与帧率无关', near(a.x, b.x, 0.01), `60fps=${a.x.toFixed(4)} 600fps=${b.x.toFixed(4)}`)
}

// 风向扰动：横向风应把粒子吹向 +x
{
  const p = { pos: vec(0, 0), vel: vec(0, 0), radius: 3, mass: 1, phase: 0 }
  const env = { ...baseEnv, wind: vec(60, 0) }
  for (let i = 0; i < 120; i++) stepParticle(p, 1 / 120, env)
  check('风向扰动：横向风推动 +x', p.pos.x > 3 && Math.abs(p.pos.y) < 1e-6, `x=${p.pos.x.toFixed(3)}`)
}
// 风向可随时间起伏（湍流）
{
  const out1 = vec()
  const out2 = vec()
  sampleWind(0, 0, 30, 0.55, out1)
  sampleWind(3.7, 0, 30, 0.55, out2)
  check('风场含低频湍流（非恒定）', Math.abs(out1.x - out2.x) > 0.01, `${out1.x.toFixed(2)} → ${out2.x.toFixed(2)}`)
}
// 风向向量的模长随 gustiness 起伏
{
  const o = vec()
  let min = Infinity
  let max = -Infinity
  for (let t = 0; t < 60; t += 0.25) {
    sampleWind(t, 0, 100, 0.9, o)
    const m = Math.hypot(o.x, o.y)
    min = Math.min(min, m)
    max = Math.max(max, m)
  }
  check('风速有阵风起伏（gust）', max - min > 20, `风速区间 ${min.toFixed(1)}~${max.toFixed(1)}`)
}
// 限速生效
{
  const v = vec(1e6, 1e6)
  limitVec(v, 100)
  check('限速：|v| ≤ max', near(Math.hypot(v.x, v.y), 100, 1e-6))
}

// ════════════════════════════════════════════════════
console.log('\n=== ③ 布朗运动 · 均方位移 MSD ∝ t ===')
// ════════════════════════════════════════════════════
// 物理要点：速度相关时间 τ = 1/k。只有 t ≫ τ 才进入扩散段（MSD ∝ t）；
// t ≪ τ 时为弹道段（MSD ∝ t²）。故取 k=2（τ=0.5s），在 t=4s/8s 处测，
// 此时 t/τ = 8 与 16，弹道项 exp(-t/τ) 已可忽略。
{
  const N = 600
  const dt = 1 / 60
  const BROWN = 60
  const DRAG = 2.0
  const mk = () => ({ pos: vec(0, 0), vel: vec(0, 0), radius: 1.5, mass: 1, phase: 0 })
  const ps = Array.from({ length: N }, mk)
  const env = { ...baseEnv, drag: DRAG, brownian: BROWN, maxSpeed: 1e9, random: createRandom(7) }

  // 测量方法很关键：若对每个时间窗重跑同一条随机流，各窗口噪声高度相关，
  // 比值误差会被放大数倍（我曾因此得到 2.39 / 2.06 两个假值）。
  // 正确做法：一次长跑 + 多时刻采样，并用**多个独立种子**做重复实验，
  // 由实验间的散布估计蒙特卡洛噪声，容差按 3σ 动态给出（而非拍脑袋定死）。
  const sampleTimes = [0.25, 0.75, 2, 4, 8]
  const runOnce = (seed) => {
    const ps = Array.from({ length: N }, mk)
    const env2 = { ...baseEnv, drag: DRAG, brownian: BROWN, maxSpeed: 1e9, random: createRandom(seed) }
    const snaps = {}
    const total = Math.round(sampleTimes[sampleTimes.length - 1] / dt)
    let si = 0
    for (let i = 1; i <= total; i++) {
      for (const p of ps) stepParticle(p, dt, env2)
      if (si < sampleTimes.length && i * dt >= sampleTimes[si] - 1e-9) {
        let s = 0
        for (const p of ps) s += p.pos.x * p.pos.x + p.pos.y * p.pos.y
        snaps[sampleTimes[si]] = s / N
        si++
      }
    }
    return snaps
  }

  const SEEDS = [7, 101, 2026]
  const runs = SEEDS.map(runOnce)
  const mean = (f) => runs.reduce((acc, s) => acc + f(s), 0) / runs.length
  const spread = (f) => {
    const vals = runs.map(f)
    return Math.max(...vals) - Math.min(...vals)
  }

  const msdQ = mean((s) => s[0.25])
  const msdQ3 = mean((s) => s[0.75])
  const msd2 = mean((s) => s[2])
  const msd4 = mean((s) => s[4])
  const msd8 = mean((s) => s[8])
  const ratio = msd8 / msd4
  check(
    '布朗运动：MSD 随时间单调增长',
    msd8 > msd4 && msd4 > msd2 && msd2 > msdQ3,
    `0.75s=${msdQ3.toFixed(0)} 2s=${msd2.toFixed(0)} 4s=${msd4.toFixed(0)} 8s=${msd8.toFixed(0)}`,
  )

  // 理论比值：由离散更新 v←a·v+Δv, x←x+v·dt 的精确无量纲形状
  //   MSD(n) ∝ n − a(1−a^n)/(1−a)
  // 该精确解同时覆盖弹道段与扩散段，比"渐近 2t"更严格。
  const a = Math.exp(-DRAG * dt)
  const shape = (t) => {
    const n = t / dt
    return n - (a * (1 - Math.pow(a, n))) / (1 - a)
  }
  const theoryRatio = shape(8) / shape(4)
  const ratioSpread = spread((s) => s[8] / s[4])
  check(
    `扩散标度吻合离散朗之万精确解（理论 ${theoryRatio.toFixed(3)}；弹道段为 4）`,
    Math.abs(ratio - theoryRatio) <= Math.max(0.03, ratioSpread * 1.5),
    `实测=${ratio.toFixed(3)}（3 种子散布 ${ratioSpread.toFixed(3)}）`,
  )

  // 超扩散判别：早期 MSD 增速快于线性（弹道特征）
  const early = msdQ3 / msdQ
  check('早期呈超扩散（弹道段 MSD∝t²，比值远大于 3）', early > 6, `MSD(0.75)/MSD(0.25)=${early.toFixed(2)}（纯扩散为 3）`)

  // 渐近线性：弹道残余随时间衰减，实测应与理论量级一致
  const residualTheory = Math.abs(shape(8) - 2 * shape(4)) / shape(8)
  const residualMeasured = Math.abs(msd8 - 2 * msd4) / msd8
  check(
    `渐近段趋于线性（实测残余 ${(residualMeasured * 100).toFixed(2)}% vs 理论 ${(residualTheory * 100).toFixed(2)}%）`,
    Math.abs(residualMeasured - residualTheory) < 0.06,
    '',
  )

  // 扩散系数 ∝ σ²（强度 ×2 → MSD ×4）
  const msdStrong = (() => {
    const strong = { ...baseEnv, drag: DRAG, brownian: BROWN * 2, maxSpeed: 1e9, random: createRandom(7) }
    const ps2 = Array.from({ length: N }, mk)
    const steps = Math.round(4 / dt)
    for (let i = 0; i < steps; i++) for (const p of ps2) stepParticle(p, dt, strong)
    let s = 0
    for (const p of ps2) s += p.pos.x * p.pos.x + p.pos.y * p.pos.y
    return s / N
  })()
  const quad = msdStrong / runs[0][4]
  check('扩散系数 ∝ σ²（强度 ×2 → MSD ≈ ×4）', quad > 3.2 && quad < 4.8, `比值=${quad.toFixed(2)}`)

  // 对照组：关闭布朗运动后应几乎不动
  const q = mk()
  const envNo = { ...baseEnv, drag: DRAG, brownian: 0 }
  for (let i = 0; i < 240; i++) stepParticle(q, dt, envNo)
  check('关闭布朗运动 → 位移近乎为 0（对照组）', Math.hypot(q.pos.x, q.pos.y) < 1e-9, `位移=${Math.hypot(q.pos.x, q.pos.y).toExponential(2)}`)

  // 高斯增量均值≈0、方差≈1
  const g = createRandom(99)
  let sum = 0
  let sum2 = 0
  const M = 40000
  for (let i = 0; i < M; i++) {
    const v = gaussian(g)
    sum += v
    sum2 += v * v
  }
  const gMean = sum / M
  const gVar = sum2 / M - gMean * gMean
  check('高斯增量均值 ≈ 0', Math.abs(gMean) < 0.03, `均值=${gMean.toFixed(4)}`)
  check('高斯增量方差 ≈ 1', Math.abs(gVar - 1) < 0.06, `方差=${gVar.toFixed(4)}`)
}

// ════════════════════════════════════════════════════
console.log('\n=== ④ 粒子躲避 · 法向排斥 ===')
// ════════════════════════════════════════════════════
{
  const obs = { x: 100, y: 100, radius: 50, strength: 900 }
  const out = vec()
  // 障碍右侧的粒子应被推向 +x
  const pr = { pos: vec(130, 100), radius: 2 }
  const hitR = repelFrom(pr, obs, 1 / 60, out)
  check('右侧粒子被推向 +x', hitR && out.x > 0 && near(out.y, 0, 1e-9), `冲量=(${out.x.toFixed(2)}, ${out.y.toFixed(2)})`)
  // 障碍上方的粒子应被推向 -y
  const pu = { pos: vec(100, 70), radius: 2 }
  repelFrom(pu, obs, 1 / 60, out)
  check('上方粒子被推向 -y', out.y < 0 && near(out.x, 0, 1e-9), `冲量=(${out.x.toFixed(2)}, ${out.y.toFixed(2)})`)
  // 越近推力越强
  const near_ = { pos: vec(102, 100), radius: 2 }
  const far_ = { pos: vec(148, 100), radius: 2 }
  const o1 = vec(); const o2 = vec()
  repelFrom(near_, obs, 1 / 60, o1)
  repelFrom(far_, obs, 1 / 60, o2)
  check('越近推力越强（三次方衰减）', o1.x > o2.x * 5, `近=${o1.x.toFixed(3)} 远=${o2.x.toFixed(4)}`)
  // 范围外不产生冲量
  const outside = { pos: vec(300, 300), radius: 2 }
  check('超出作用半径 → 无冲量', repelFrom(outside, obs, 1 / 60, out) === false)
}

// ════════════════════════════════════════════════════
console.log('\n=== ⑤ 涟漪 · 半径按 √t 扩散 ===')
// ════════════════════════════════════════════════════
{
  const r = { x: 0, y: 0, radius: 0, maxRadius: 100, alpha: 1, age: 0, life: 1 }
  const dt = 1 / 60
  // t = 0.25s（life 的 1/4）→ radius 应为 maxRadius·√0.25 = 50
  for (let i = 0; i < 15; i++) stepRipple(r, dt)
  check('涟漪半径 = R·√(t/life)', near(r.radius, 50, 1.5), `${r.radius.toFixed(1)} (期望 50)`)
  check('涟漪透明度随时间衰减', r.alpha < 0.8, `alpha=${r.alpha.toFixed(3)}`)
  // 生命周期结束后应被回收
  let alive = true
  for (let i = 0; i < 60; i++) alive = stepRipple(r, dt)
  check('涟漪超时后被回收', alive === false)
}

// ════════════════════════════════════════════════════
console.log('\n=== ⑥ 帧率无关性 · 不同 dt 积分一致 ===')
// ════════════════════════════════════════════════════
{
  const mkP = () => ({ pos: vec(0, 0), vel: vec(0, 0), radius: 3, mass: 1, phase: 0 })
  const run = (dt, total) => {
    const p = mkP()
    const env = { ...baseEnv, gravity: 80, drag: 0.5, wind: vec(30, 0), random: createRandom(1) }
    const steps = Math.round(total / dt)
    for (let i = 0; i < steps; i++) { env.time = i * dt; stepParticle(p, dt, env) }
    return p
  }
  const a = run(1 / 120, 2)
  const b = run(1 / 60, 2)
  const c = run(1 / 30, 2)
  const dErr = Math.abs(a.pos.y - b.pos.y)
  const dErr2 = Math.abs(a.pos.y - c.pos.y)
  check('60fps vs 120fps 位移差 < 3px', dErr < 3, `Δy=${dErr.toFixed(3)}`)
  check('30fps vs 120fps 位移差 < 8px', dErr2 < 8, `Δy=${dErr2.toFixed(3)}`)
}

// ════════════════════════════════════════════════════
console.log('\n=== ⑦ 确定性 · 同种子同结果 ===')
// ════════════════════════════════════════════════════
{
  const build = () => {
    const r = createRandom(2026)
    return Array.from({ length: 50 }, () => r())
  }
  const s1 = build()
  const s2 = build()
  check('同种子随机序列完全一致', s1.every((v, i) => v === s2[i]))
  const s3 = (() => { const r = createRandom(2027); return Array.from({ length: 50 }, () => r()) })()
  check('不同种子序列不同', s1.some((v, i) => v !== s3[i]))
}

// ════════════════════════════════════════════════════
console.log('\n' + '─'.repeat(56))
console.log(`结果：${pass} 通过 / ${fail} 失败  （共 ${pass + fail} 项）`)
console.log('─'.repeat(56))
process.exit(fail === 0 ? 0 : 2)
