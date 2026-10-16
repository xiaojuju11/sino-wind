const rhymeData = require('../data/pingshui.json')
const poems = require('../data/feihuaPoems')
// 令字白名单：任务书（2026-10-15）点名「花、月、春、风、夜、酒、云、雨、山、水」
// 10 大核心经典令字，均已核实题库可支撑（含字句数 / 可判唯一韵部句数）：
//   花 34/28  月 40/34  春 30/22  风 33/29  夜 23/19
//   酒 15/14  云 16/11  雨 16/12  山 35/28  水 21/18
// 另保留「愁心明秋江」五个既有令字（愁 9/8、明 19/17、江 24/20 尚可；
// 心仅 5/5 偏薄 —— 语料中含「心」的 6 首作品已全部入库，扩库需引入新语料源）。
const KEYWORDS = ['月', '花', '风', '山', '水', '春', '夜', '酒', '云', '雨', '愁', '心', '明', '秋', '江']
const SAGES = Object.freeze({
  libai: { name: '李白', keywords: ['月', '山', '水', '风'], style: '纵情山水，豪迈浪漫' },
  sushi: { name: '苏轼', keywords: ['月', '风', '江', '水'], style: '旷达清欢，豪放通透' },
  liqingzhao: { name: '李清照', keywords: ['花', '愁', '月', '风'], style: '婉约清丽，优先引易安词与宋词' },
  wangyangming: { name: '王阳明', keywords: ['山', '水', '心', '明'], style: '知行相资，优先心学与理趣诗句' },
  dufu: { name: '杜甫', keywords: ['春', '秋', '江', '风'], style: '沉郁顿挫，心系苍生' }
})
const index = new Map()
for (const group of rhymeData.groups) for (const char of group.characters) {
  if (!index.has(char)) index.set(char, [])
  index.get(char).push(group.name)
}
const normalize = text => typeof text === 'string' ? text.normalize('NFKC').replace(/[\s，。！？、；：,.!?;:“”‘’「」『』]/gu, '') : ''
const entries = new Map(poems.map(p => [normalize(p.line), p]))
function rhymeGroups(line) { return index.get(Array.from(line).at(-1)) || [] }
function createGame({ sageId = 'libai', keyword = '月', rhyme = '', nickname = '未登录雅士', playedLines = [] }, now) {
  if (!Object.hasOwn(SAGES, sageId) || !KEYWORDS.includes(keyword) || (rhyme && !rhymeData.groups.some(g => g.name === rhyme))) throw new Error('无效的先贤、令字或韵部')
  if (rhyme && !poems.some(p => p.line.includes(keyword) && rhymeGroups(p.line).includes(rhyme))) throw new Error('此令字与韵部暂无题库诗句，请另选韵部')
  // playedLines：该用户/访客此前各局用过的句子（已 normalize），用于跨局去重。
  // 由调用方（feihuaController）从历史对局注入；上限 800 条以控体积。
  const history = Array.isArray(playedLines) ? playedLines.filter(x => typeof x === 'string').slice(0, 800) : []
  return { sageId, keyword, rhyme, nickname, version: 0, status: 'playing', deadline: now + 30000, turns: [], rounds: 0, winner: null, reason: '', endedAt: null, playedLines: history }
}
function finish(game, winner, reason, now) {
  game.status = 'finished'; game.winner = winner; game.reason = reason; game.endedAt = now; game.deadline = null
  return game
}
function move(previous, { action, line }, now) {
  const game = structuredClone(previous)
  if (game.status !== 'playing') return { game, changed: false }
  if (now >= game.deadline) { game.version++; return { game: finish(game, 'sage', '三十息已尽，本轮未应令', now), changed: true } }
  if (action === 'timeout') return { game, changed: false }
  if (action === 'resign') { game.version++; return { game: finish(game, 'sage', '雅士揖让收局', now), changed: true } }
  if (action !== 'submit' || typeof line !== 'string' || line.length > 100) throw new Error('请提交一条诗句')
  const text = normalize(line)
  if (!text) return { game, changed: false, feedback: '请填写诗句' }
  if (!text.includes(game.keyword)) { game.version++; return { game: finish(game, 'sage', `诗句未含令字「${game.keyword}」`, now), changed: true } }
  if (game.turns.some(t => normalize(t.line) === text)) { game.version++; return { game: finish(game, 'sage', '诗句重复，先贤胜出', now), changed: true } }
  // 跨局去重：同一用户/访客此前用过的句子不得再次报出（由调用方注入 playedLines）
  if (Array.isArray(game.playedLines) && game.playedLines.includes(text)) {
    game.version++; return { game: finish(game, 'sage', '此句此前已用过，先贤胜出', now), changed: true }
  }
  const poem = entries.get(text)
  // Unknown poems are not called wrong or assigned a guessed pronunciation.
  if (!poem) return { game, changed: false, feedback: '此句未收录于本局经典题库，暂不判负；请换用已收录原句，倒计时继续' }

  // ── 押韵校验（2026-10-15 改为逐句合规，不再跨轮锁死）────────────────────
  // 原实现：本轮第一次提交会把整局韵部锁死，此后任何不同韵的名句都直接判负。
  //   实测：令字=月 开局后提交「床前明月光」被判「句末不属本局入声六月」
  //   （光属七阳，而「举头望明月」把韵锁成了入声六月）——玩家用正确名句反被判负。
  //   且锁定后含「月」+ 该韵的句子全库仅 10 句，一局最多撑 5 轮。
  // 任务书只要求「韵脚合规性校验」，未要求跨轮同一韵。经团队确认为【方案 1B + 2B】，故改为：
  //   · 玩家每句只需韵脚能被平水韵收录（合规即通过，可自由换韵）；
  //   · 先贤答句必须与【玩家本句】同韵（保留"唱和"的文学性）。
  // 仍支持开局显式指定韵部（createGame 的 rhyme 参数）：此时保持严格同韵。
  const groups = rhymeGroups(text)
  if (!groups.length) {
    return { game, changed: false, feedback: '句末一字未见於平水韵，请换一句（可自由换韵，无需与上一句同韵）' }
  }
  const strict = Boolean(game.rhyme)   // 仅当开局显式指定了韵部才严格同韵
  if (strict && !groups.includes(game.rhyme)) {
    game.version++; return { game: finish(game, 'sage', `本局指定「${game.rhyme}」，此句句末不属该韵`, now), changed: true }
  }
  game.turns.push({ role: 'user', ...poem })
  game.rounds++; game.version++

  // 先贤应句：三级降级挑选，避免因押韵过严导致"先贤无句可应、玩家白赢"。
  //   ① 含令字 + 与玩家本句【同韵】 + 作者优先（最理想的唱和）
  //   ② 含令字 + 任意韵脚（押韵是加分项，不应让先贤无句可应）
  //   ③ 都没有 → 才判玩家胜
  // 实测教训：若只允许①，令字「月/山/夜」会在第 1 轮就因同韵句耗尽而结束。
  const used = new Set(game.turns.map(t => t.line))
  const shared = (p) => { const g = rhymeGroups(p.line); return g.some(x => groups.includes(x)) }
  const priority = p => p.author === SAGES[game.sageId]?.name ? 10 : game.sageId === 'liqingzhao' && p.dynasty === '宋' ? 5 : game.sageId === 'wangyangming' && ['观书有感','题西林壁','登鹳雀楼','登飞来峰'].includes(p.title) ? 5 : 0
  const pick = (predicate) => {
    const list = poems.filter(p => p.line.includes(game.keyword) && !used.has(p.line) && predicate(p))
    list.sort((a, b) => priority(b) - priority(a))
    return list[0]
  }
  let chosen = pick(p => shared(p) && (!strict || rhymeGroups(p.line).includes(game.rhyme)))
  if (!chosen && !strict) chosen = pick(() => true)   // 仅自由换韵模式允许降级，指定韵部时双方严格同韵
  if (!chosen) return { game: finish(game, 'user', '本局经典题库已无可应之句，雅士胜出', now), changed: true }
  game.turns.push({ role: 'sage', ...chosen })
  if (game.rounds >= 6) return { game: finish(game, 'draw', '六轮唱和俱合令，以和为贵', now), changed: true }
  game.deadline = now + 30000
  return { game, changed: true }
}
const points = game => game.status !== 'finished' ? 0 : game.winner === 'user' ? 3 : game.winner === 'draw' ? 1 : 0
// One authoritative rank function; clients consume its API result rather than guessing.
function scholarRank(value) {
  const score = Math.max(0, Number(value) || 0)
  return [
    [5, '白衣布衣'], [15, '秀才 / 茂才'], [30, '举人 / 乡贡'],
    [60, '贡士'], [100, '同进士出身'], [150, '进士及第'], [Infinity, '翰林大学士']
  ].find(([ceiling]) => score <= ceiling)[1]
}
module.exports = { KEYWORDS, SAGES, createGame, move, points, scholarRank, normalize, rhymeGroups, poems, rhymeData }

