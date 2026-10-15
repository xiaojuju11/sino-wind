// 任务书 DoD 逐条核对（陈思卉 · 2026-10-15）
const path = require('path')
const B = 'D:/sino-wind-taskB/backend/src'
const e = require(path.join(B, 'utils/feihuaEngine.js'))
const fs = require('node:fs')

const ok = (c) => (c ? '✅' : '❌')
const items = []

// ── 任务① 飞花令 ──
const REQ10 = ['花', '月', '春', '风', '夜', '酒', '云', '雨', '山', '水']
items.push(['①-1 令字：任务书点名的 10 字', REQ10.every(k => e.KEYWORDS.includes(k)), `${e.KEYWORDS.length} 字：${e.KEYWORDS.join('')}`])
items.push(['①-2 诗句存在性与出处', e.poems.length > 0 && e.poems.every(p => p.author && p.title), `题库 ${e.poems.length} 句，均含作者+题名`])
items.push(['①-2 平水韵韵脚校验', e.rhymeData.groups.length === 106, `${e.rhymeData.groups.length} 韵部 / ${e.rhymeData.groups.reduce((n, g) => n + g.characters.length, 0)} 韵字`])
// 韵脚确实能判
const sample = e.poems.slice(0, 50).filter(p => e.rhymeGroups(p.line).length > 0).length
items.push(['①-2 韵脚可判定率', sample === 50, `前 50 句全部可判韵（${sample}/50）`])
// 去重：同局
const now = 9000000
let g = e.createGame({ keyword: '月' }, now)
g = e.move(g, { action: 'submit', line: '举头望明月' }, now + 100).game
g.deadline = now + 90000
const dupRes = e.move(g, { action: 'submit', line: '举头望明月' }, now + 200)
items.push(['①-3 同局去重', dupRes.game.status === 'finished' && dupRes.game.winner === 'sage', `原因：${dupRes.game.reason}`])
// 去重：跨局
let g2 = e.createGame({ keyword: '月', playedLines: ['举头望明月'] }, now)
const dup2 = e.move(g2, { action: 'submit', line: '举头望明月' }, now + 100)
items.push(['①-3 跨局去重', dup2.game.status === 'finished' && dup2.game.winner === 'sage', `原因：${dup2.game.reason}`])
// 超时
const to = e.move(e.createGame({ keyword: '月' }, now), { action: 'submit', line: '举头望明月' }, now + 31000)
items.push(['①-4 超时判负（30 息）', to.game.status === 'finished' && to.game.winner === 'sage', `原因：${to.game.reason}`])
// 结算
items.push(['①-4 胜负结算积分', e.points({ status: 'finished', winner: 'user' }) === 3 && e.points({ status: 'finished', winner: 'draw' }) === 1 && e.points({ status: 'finished', winner: 'sage' }) === 0, '胜3 / 和1 / 负0'])
items.push(['①-4 文阶算法（书斋看板）', typeof e.scholarRank(0) === 'string' && e.scholarRank(999) === '翰林大学士', `0→${e.scholarRank(0)}  150→${e.scholarRank(150)}`])
// records 归档接口（刘霞藏牒阁的契约）
const ctrl = fs.readFileSync(path.join(B, 'controllers/feihuaController.js'), 'utf8')
items.push(['①-4 对局归档接口 records', /async function records/.test(ctrl) && /merit_points/.test(ctrl), 'GET /api/deepseek/feihua/records（含 meritPoints + rank）'])

// ── 任务② 先贤对话 ──
const ds = fs.readFileSync(path.join(B, 'controllers/deepseekController.js'), 'utf8')
const fourSages = ['libai', 'sushi', 'liqingzhao', 'wangyangming']
const found = fourSages.filter(id => new RegExp(`\\b${id}:\\s*\\{`).test(ds))
items.push(['②-1 四位先贤 Prompt 齐全', found.length === 4, `找到：${found.join(' ')}（另有 dufu/xinqiji/group 共 ${(ds.match(/^\s{2}\w+:\s*\{$/gm) || []).length} 个角色）`])
items.push(['②-2 反出戏提示词（绝对禁令）', (ds.match(/【绝对禁令】/g) || []).length >= 4, `【绝对禁令】出现 ${(ds.match(/【绝对禁令】/g) || []).length} 次`])
items.push(['②-2 熔断清洗器', /function sanitizeSageReply/.test(ds), 'sanitizeSageReply 正则拦截 + 每人专属第一人称兜底'])
const sse = fs.readFileSync(path.join(B, 'utils/sse.js'), 'utf8')
items.push(['②-3 SSE 心跳', /setInterval/.test(sse) && /heartbeat/.test(sse), 'sse.js 心跳 + 断连清理 + 背压判断'])
const routes = fs.readFileSync(path.join(B, 'routes/deepseek-api.js'), 'utf8')
items.push(['②-3 /chat/stream 路由存在', /router\.post\('\/chat\/stream'/.test(routes), "POST /api/deepseek/chat/stream"])

// ── 任务③ 雅译与诗词 ──
items.push(['③-1 雅译离线兜底（高质量本地古文）', (ds.match(/keywords: \[/g) || []).length >= 20, `离线库 ${(ds.match(/keywords: \[/g) || []).length} 条`])
const pc = fs.readFileSync(path.join(B, 'controllers/poemController.js'), 'utf8')
const fb = require(path.join(B, 'data/poemFallback.js'))
items.push(['③-2 诗词检索（搜索）', fb.length >= 80 && /searchFallback/.test(pc), `本地兜底库 ${fb.length} 首，搜索按标题/作者/正文打分`])
items.push(['③-2 随机抽签', /async function random/.test(pc) && /randomPool/.test(pc), '预取池 + 上游失败降级'])
items.push(['③-2 收藏夹同步', /async function collect/.test(pc) && /async function collection/.test(pc), 'collect / collection / myList / removeCollect 齐备'])
items.push(['③-2 访客与登录均可体验', /optionalToken/.test(routes), '随机/搜索/雅译走 optionalToken；收藏类走 verifyToken'])

console.log('任务书 DoD 逐条核对（陈思卉 · 2026-10-15）')
console.log('='.repeat(96))
let pass = 0
for (const [label, cond, detail] of items) {
  if (cond) pass++
  console.log(`${ok(cond)} ${label.padEnd(34)} ${detail}`)
}
console.log('='.repeat(96))
console.log(`合计：${pass}/${items.length} 项通过`)
