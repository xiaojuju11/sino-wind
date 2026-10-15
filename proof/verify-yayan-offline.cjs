// 雅译离线兜底覆盖度实测
// ⚠️ 必须临时移走 backend/.env.local：其 dotenv override:true 会覆盖进程环境变量，
//    否则会带真实 Key 走到模型路径，测不到离线分支（我曾在此处误判过一次）。
const { spawn } = require('node:child_process')
const fs = require('node:fs')

const BACKEND = 'D:/sino-wind-taskB/backend'
const ENV = BACKEND + '/.env.local'
const HIDDEN = BACKEND + '/.env.local.hidden'
const PORT = 3000
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

if (!fs.existsSync(ENV)) {
  console.log('❌ 未找到 .env.local，请先确认后端配置存在')
  process.exit(1)
}
// 备份 + 移走
const backup = fs.readFileSync(ENV)
fs.writeFileSync(HIDDEN, backup)
fs.unlinkSync(ENV)
console.log('  已临时移走 .env.local（用完自动恢复）')

const child = spawn(process.execPath, ['src/index.js'], { cwd: BACKEND, stdio: 'ignore' })
let restored = false
const restore = () => {
  if (restored) return
  restored = true
  try {
    if (fs.existsSync(HIDDEN)) { fs.writeFileSync(ENV, fs.readFileSync(HIDDEN)); fs.unlinkSync(HIDDEN) }
    const same = Buffer.compare(fs.readFileSync(ENV), backup) === 0
    console.log(`\n  .env.local 已恢复，与备份逐字节一致: ${same ? '✅' : '❌ 不一致！'}`)
  } catch (e) {
    console.log('  ⚠️ 恢复失败:', e.message)
  }
}
process.on('exit', restore)
process.on('SIGINT', () => { restore(); process.exit(1) })

;(async () => {
  let ready = false
  for (let i = 0; i < 40; i++) {
    await sleep(500)
    try { const r = await fetch(`http://127.0.0.1:${PORT}/api/deepseek/feihua/rules`); if (r.ok) { ready = true; break } } catch {}
  }
  if (!ready) { console.log('  ❌ 后端未就绪（端口可能被占用）'); child.kill(); process.exit(1) }
  console.log(`  ✅ 无 Key 后端已就绪（:${PORT}）\n`)

  const cases = [
    '今天心情真好', '工作压力好大', '想念老朋友了', '想努力赚钱', '加班到深夜好累',
    '喜欢一个人', '一个人好孤单', '想回家了', '春天花开了', '下雨天',
    '下雪了很冷', '秋天落叶', '和朋友喝酒庆祝', '人生感慨', '平淡的小幸福',
    '学习进步了', '舍不得说再见', '等你回来', '有点后悔', '坚持下去',
    '随便说一句话', '又是一句无关的话', '还有第三句无关的话',
  ]
  const seen = new Map()
  console.log('  场景 → 匹配到的雅言')
  console.log('  ' + '-'.repeat(70))
  for (const c of cases) {
    const res = await fetch(`http://127.0.0.1:${PORT}/api/deepseek/yayan`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: c }),
    })
    const j = await res.json()
    const d = j.data || {}
    seen.set(d.ancient, (seen.get(d.ancient) || 0) + 1)
    console.log(`  ${c.padEnd(12)} → ${String(d.ancient || '(空)').slice(0, 22).padEnd(24)} ${d.author || ''}`)
  }
  console.log('')
  console.log(`  不同雅言条数: ${seen.size} / ${cases.length}`)
  const dup = [...seen.entries()].filter(([, n]) => n > 1)
  if (dup.length) { console.log('  重复项（均为关键词相互匹配的场景，属预期）:'); dup.forEach(([k, n]) => console.log(`    ${n}× ${k.slice(0, 22)}`)) }
  console.log(`  ${seen.size >= 15 ? '✅ 覆盖良好（≥15 种不同雅言）' : '⚠️ 覆盖仍偏窄'}`)

  // 字段泄漏检查
  const one = await (await fetch(`http://127.0.0.1:${PORT}/api/deepseek/yayan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: '今天心情真好' }),
  })).json()
  console.log(`  返回字段: ${Object.keys(one.data).join(', ')}`)
  console.log(`  keywords 是否泄漏: ${'keywords' in one.data ? '❌ 是' : '✅ 否'}`)

  child.kill()
  restore()
  process.exit(0)
})()
