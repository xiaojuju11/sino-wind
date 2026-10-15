// 跨局去重端到端验证（登录用户路径）
const { createRequire } = require('node:module')
const req = createRequire('D:/sino-wind-taskB/backend/package.json')
const jwt = req('jsonwebtoken')
const B = 'D:/sino-wind-taskB/backend'
req('dotenv').config({ path: B + '/.env' })
req('dotenv').config({ path: B + '/.env.local', override: true })
const SECRET = process.env.JWT_SECRET || 'sino_wind_gufeng_jwt_secret_2026'
const USER_ID = 2
const token = jwt.sign({ id: USER_ID }, SECRET, { expiresIn: '1h' })
console.log(`  为 user_id=${USER_ID} 签发测试 token（用默认 JWT_SECRET）`)

async function api(p, body) {
  const r = await fetch('http://127.0.0.1:3000' + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token },
    body: JSON.stringify(body),
  })
  return { status: r.status, j: await r.json() }
}

;(async () => {
  console.log('')
  console.log('=== 第一局：提交「举头望明月」，写入历史 ===')
  let r = await api('/api/deepseek/feihua/start', { sageId: 'libai', keyword: '月' })
  const g1 = r.j.data
  console.log('  开局 HTTP', r.status, '| 注入历史句数:', (g1.playedLines || []).length)
  r = await api('/api/deepseek/feihua/turn', { id: g1.id, version: g1.version, action: 'submit', line: '举头望明月' })
  console.log('  提交 HTTP', r.status, '| 轮次:', r.j.data?.rounds, '| 状态:', r.j.data?.status)

  console.log('')
  console.log('=== 第二局：应带出上局用过的句子 ===')
  r = await api('/api/deepseek/feihua/start', { sageId: 'libai', keyword: '月' })
  const g2 = r.j.data
  const injected = g2.playedLines || []
  console.log('  开局 HTTP', r.status, '| 注入历史句数:', injected.length)
  console.log('  含「举头望明月」:', injected.includes('举头望明月') ? '✅ 是' : '❌ 否')

  console.log('')
  console.log('=== 重复提交同一句 → 应判先贤胜 ===')
  r = await api('/api/deepseek/feihua/turn', { id: g2.id, version: g2.version, action: 'submit', line: '举头望明月' })
  const d = r.j.data || {}
  console.log('  HTTP', r.status, '| 状态:', d.status, '| winner:', d.winner, '| 原因:', d.reason)
  console.log('  ' + (d.status === 'finished' && d.winner === 'sage' ? '✅ 跨局去重生效' : '❌ 去重未生效'))

  console.log('')
  console.log('=== 未用过的句子应正常通过 ===')
  r = await api('/api/deepseek/feihua/start', { sageId: 'libai', keyword: '月' })
  const g3 = r.j.data
  r = await api('/api/deepseek/feihua/turn', { id: g3.id, version: g3.version, action: 'submit', line: '海上生明月' })
  console.log('  提交「海上生明月」→ 状态:', r.j.data?.status, '轮次:', r.j.data?.rounds,
    r.j.data?.status === 'playing' ? '✅ 正常' : '❌')
  console.log('')
  console.log('  本次测试产生的对局 id（可清理）:')
  console.log('   ', g1.id, '\n   ', g2.id, '\n   ', g3.id)
})()
