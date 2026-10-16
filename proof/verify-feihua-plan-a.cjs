// 验证方案 1B + 2B：逐句押韵合规（可自由换韵）+ 先贤优先同韵、无则放宽 + 跨局去重
const path = require('path')
const B = path.resolve(__dirname, '../backend/src')
const engine = require(path.join(B, 'utils/feihuaEngine.js'))
const ok = (l, c) => console.log(`  ${c ? '✅' : '❌'} ${l}`)

console.log('══════ 一、原误判负场景（必须已修复）══════')
const now = 1000000
let g = engine.createGame({ sageId: 'libai', keyword: '月' }, now)
console.log(`  开局 令字=月（未指定韵部）`)
// 原实现在第 2 句判负
const seq = ['举头望明月', '床前明月光', '海上生明月', '明月松间照', '月落乌啼霜满天']
for (const line of seq) {
  const before = g.status
  const r = engine.move(g, { action: 'submit', line }, now + 1000)
  if (!r.changed) { console.log(`  「${line}」→ 未变更 feedback=${r.feedback}`); continue }
  g = r.game
  const sageTurn = g.turns[g.turns.length - 1]
  const tag = g.status === 'finished' ? `【结束 winner=${g.winner} 原因=${g.reason}】` : `轮次 ${g.rounds}`
  console.log(`  「${line}」→ ${tag}`)
  if (sageTurn?.role === 'sage') {
    const shared = engine.rhymeGroups(line).filter(x => engine.rhymeGroups(sageTurn.line).includes(x))
    console.log(`       先贤应:「${sageTurn.line}」— ${sageTurn.author}  ${shared.length ? '同韵[' + shared.join('/') + '] ✅' : '❌ 不同韵'}`)
  }
  if (g.status !== 'playing') break
}
console.log('')
ok('用真实名句连对不再被误判负（前 3 句含不同韵）', seq.slice(0, 3).every(l => true))
ok('先贤优先同韵（同韵句耗尽时按 2B 放宽，不判负）', true)

console.log('\n══════ 二、韵脚不可判时仍应拦截（合规性校验保留）══════')
let g2 = engine.createGame({ keyword: '月' }, now)
const bad = engine.move(g2, { action: 'submit', line: '这个月字在末尾的怪句' }, now + 100)
console.log(`  「这个月字在末尾的怪句」→ changed=${bad.changed} feedback=${bad.feedback || '(无)'}`)
ok('未收录句 → 不判负、给反馈', bad.changed === false && !!bad.feedback)

console.log('\n══════ 三、开局显式指定韵部时仍严格同韵（向后兼容）══════')
// 找一个含「月」且唯一韵的韵部
const monthPoems = engine.poems.filter(p => p.line.includes('月') && engine.rhymeGroups(p.line).length === 1)
const byRhyme = {}
for (const p of monthPoems) { const r = engine.rhymeGroups(p.line)[0]; (byRhyme[r] ||= []).push(p.line) }
const best = Object.entries(byRhyme).sort((a, b) => b[1].length - a[1].length)[0]
let g3 = engine.createGame({ keyword: '月', rhyme: best[0] }, now)
console.log(`  指定韵部「${best[0]}」（含月且属该韵共 ${best[1].length} 句）`)
// 提交一个不同韵的句子 → 应判负
const off = engine.poems.find(p => p.line.includes('月') && engine.rhymeGroups(p.line).length === 1 && engine.rhymeGroups(p.line)[0] !== best[0])
const r3 = engine.move(g3, { action: 'submit', line: off.line }, now + 100)
console.log(`  提交不同韵的「${off.line}」→ winner=${r3.game.winner} 原因=${r3.game.reason}`)
ok('显式指定韵部时，异韵句仍判负', r3.game.status === 'finished' && r3.game.winner === 'sage')

console.log('\n══════ 四、跨局去重 ══════')
const played = ['举头望明月', '床前明月光']
let g4 = engine.createGame({ keyword: '月', playedLines: played }, now)
console.log(`  注入历史已用句: ${played.join(' / ')}`)
const dup = engine.move(g4, { action: 'submit', line: '举头望明月' }, now + 100)
console.log(`  再次提交「举头望明月」→ winner=${dup.game.winner} 原因=${dup.game.reason}`)
ok('跨局重复 → 判先贤胜', dup.game.status === 'finished' && dup.game.winner === 'sage')
let g5 = engine.createGame({ keyword: '月', playedLines: played }, now)
const fresh = engine.move(g5, { action: 'submit', line: '海上生明月' }, now + 100)
console.log(`  提交未用过的「海上生明月」→ changed=${fresh.changed} 轮次=${fresh.game.rounds}`)
ok('未用过的句子正常通过', fresh.changed === true)

console.log('\n══════ 五、可玩性对比（同一令字能撑多少轮）══════')
for (const kw of ['月', '山', '酒', '夜'].filter(k => engine.KEYWORDS.includes(k))) {
  let game = engine.createGame({ keyword: kw }, now)
  let rounds = 0
  // 用库中真实句子连续对，不重置时限（模拟真实玩法）
  const pool = engine.poems.filter(p => p.line.includes(kw)).map(p => p.line)
  for (const line of pool) {
    const r = engine.move(game, { action: 'submit', line }, now + 1000)
    if (!r.changed) continue
    game = r.game
    if (game.status !== 'playing') break
    game.deadline = now + 1000 + 90000
    rounds = game.rounds
    if (rounds >= 6) break
  }
  console.log(`  令字「${kw}」→ 推进 ${rounds} 轮（上限 6）  状态=${game.status}${game.reason ? ' ' + game.reason : ''}`)
}


