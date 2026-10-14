const rhymeData = require('../data/pingshui.json')
const poems = require('../data/feihuaPoems')
const KEYWORDS = ['月', '花', '风', '山', '水', '春']
const index = new Map()
for (const group of rhymeData.groups) for (const char of group.characters) {
  if (!index.has(char)) index.set(char, [])
  index.get(char).push(group.name)
}
const normalize = text => typeof text === 'string' ? text.normalize('NFKC').replace(/[\s，。！？、；：,.!?;:“”‘’「」『』]/gu, '') : ''
const entries = new Map(poems.map(p => [normalize(p.line), p]))
function rhymeGroups(line) { return index.get(Array.from(line).at(-1)) || [] }
function createGame({ sageId = 'libai', keyword = '月', rhyme = '', nickname = '未登录雅士' }, now) {
  if (!['libai', 'sushi'].includes(sageId) || !KEYWORDS.includes(keyword) || (rhyme && !rhymeData.groups.some(g => g.name === rhyme))) throw new Error('无效的先贤、令字或韵部')
  if (rhyme && !poems.some(p => p.line.includes(keyword) && rhymeGroups(p.line).includes(rhyme))) throw new Error('此令字与韵部暂无题库诗句，请另选韵部')
  return { sageId, keyword, rhyme, nickname, version: 0, status: 'playing', deadline: now + 30000, turns: [], rounds: 0, winner: null, reason: '', endedAt: null }
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
  const poem = entries.get(text)
  // Unknown poems are not called wrong or assigned a guessed pronunciation.
  if (!poem) return { game, changed: false, feedback: '此句未收录于本局经典题库，暂不判负；请换用已收录原句，倒计时继续' }
  const groups = rhymeGroups(text)
  if (game.rhyme && !groups.includes(game.rhyme)) { game.version++; return { game: finish(game, 'sage', `句末不属本局「${game.rhyme}」`, now), changed: true } }
  if (!game.rhyme) {
    if (groups.length !== 1) return { game, changed: false, feedback: '句末存在多韵或未收录，请开局明确指定韵部，或换一句' }
    game.rhyme = groups[0]
  }
  game.turns.push({ role: 'user', ...poem })
  game.rounds++; game.version++
  const available = poems.filter(p => p.line.includes(game.keyword) && rhymeGroups(p.line).includes(game.rhyme) && !game.turns.some(t => t.line === p.line))
  available.sort((a, b) => Number(b.author === (game.sageId === 'libai' ? '李白' : '苏轼')) - Number(a.author === (game.sageId === 'libai' ? '李白' : '苏轼')))
  if (!available.length) return { game: finish(game, 'user', '本局经典题库已无可应之句，雅士胜出', now), changed: true }
  game.turns.push({ role: 'sage', ...available[0] })
  if (game.rounds >= 6) return { game: finish(game, 'draw', '六轮唱和俱合令，以和为贵', now), changed: true }
  game.deadline = now + 30000
  return { game, changed: true }
}
const points = game => game.status !== 'finished' ? 0 : game.winner === 'user' ? 3 : game.winner === 'draw' ? 1 : 0
module.exports = { KEYWORDS, createGame, move, points, normalize, rhymeGroups, poems, rhymeData }
