// 真实玩法模拟：玩家随机挑句，统计对局能进行多少轮、胜率分布
const path = require('path')
const engine = require(path.join('D:/sino-wind-taskB/backend/src', 'utils/feihuaEngine.js'))

// 简易可复现随机
let seed = 20261015
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
const pickRandom = (arr) => arr[Math.floor(rnd() * arr.length)]

function simulate(keyword, games = 200) {
  const pool = engine.poems.filter(p => p.line.includes(keyword)).map(p => p.line)
  const stats = { rounds: [], winUser: 0, winSage: 0, draw: 0, stuck: 0 }
  for (let i = 0; i < games; i++) {
    const now = 5000000 + i * 100000
    let g = engine.createGame({ keyword }, now)
    const tried = new Set()
    let guard = 0
    while (g.status === 'playing' && guard++ < 40) {
      const cand = pool.filter(l => !tried.has(l))
      if (!cand.length) { stats.stuck++; break }
      const line = pickRandom(cand)
      tried.add(line)
      const r = engine.move(g, { action: 'submit', line }, now + 1000)
      if (!r.changed) continue
      g = r.game
      if (g.status === 'playing') g.deadline = now + 1000 + 90000
    }
    stats.rounds.push(g.rounds)
    if (g.winner === 'user') stats.winUser++
    else if (g.winner === 'sage') stats.winSage++
    else if (g.winner === 'draw') stats.draw++
  }
  const avg = stats.rounds.reduce((a, b) => a + b, 0) / stats.rounds.length
  const ge3 = stats.rounds.filter(r => r >= 3).length
  const ge5 = stats.rounds.filter(r => r >= 5).length
  return { avg: avg.toFixed(2), ge3: `${ge3}/${games}`, ge5: `${ge5}/${games}`, ...stats }
}

console.log('真实玩法模拟（每令字 200 局，玩家随机挑句）')
console.log('令字   平均轮数  ≥3轮      ≥5轮      玩家胜  先贤胜  和局')
console.log('-'.repeat(66))
const REQ_WANT = ['花', '月', '春', '风', '夜', '酒', '云', '雨', '山', '水']
const REQ = REQ_WANT.filter(k => engine.KEYWORDS.includes(k))
const MISSING = REQ_WANT.filter(k => !engine.KEYWORDS.includes(k))
if (MISSING.length) console.log(`注意：以下令字当前不在白名单（属决策点 5，未定）：${MISSING.join(' ')}\n`)
for (const kw of REQ) {
  const s = simulate(kw, 200)
  console.log(
    `${kw}     ${String(s.avg).padStart(6)}   ${s.ge3.padEnd(9)} ${s.ge5.padEnd(9)} ${String(s.winUser).padStart(5)}  ${String(s.winSage).padStart(6)}  ${String(s.draw).padStart(5)}`,
  )
}
console.log('')
console.log('说明：平均轮数越接近 6 越好（6 轮为和局上限）；「玩家胜」= 先贤无句可应。')

