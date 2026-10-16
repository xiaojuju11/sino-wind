// 统计代码规模（学生实际工作量的硬证据）
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const ROOT = 'D:/sino-wind-taskB'
const walk = (d, filter, out = []) => {
  if (!fs.existsSync(d)) return out
  for (const n of fs.readdirSync(d)) {
    if (n === 'node_modules' || n === '.git' || n === 'dist') continue
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) walk(p, filter, out)
    else if (filter(n)) out.push(p)
  }
  return out
}
const countLines = (files) => files.reduce((n, f) => n + fs.readFileSync(f, 'utf8').split(/\r?\n/).length, 0)

const groups = [
  { name: '前端页面 pages/*.jsx', files: walk(ROOT + '/frontend/src/pages', (n) => /\.jsx?$/.test(n)) },
  { name: '前端组件 components/**', files: walk(ROOT + '/frontend/src/components', (n) => /\.jsx?$/.test(n)) },
  { name: '前端工具 utils/**', files: walk(ROOT + '/frontend/src/utils', (n) => /\.jsx?$/.test(n)) },
  { name: '前端样式 styles/**', files: walk(ROOT + '/frontend/src/styles', (n) => /\.less$/.test(n)) },
  { name: '前端样式 components/**/*.less', files: walk(ROOT + '/frontend/src/components', (n) => /\.less$/.test(n)) },
  { name: '后端 controllers/**', files: walk(ROOT + '/backend/src/controllers', (n) => /\.js$/.test(n)) },
  { name: '后端 utils/**', files: walk(ROOT + '/backend/src/utils', (n) => /\.js$/.test(n)) },
  { name: '后端 routes/**', files: walk(ROOT + '/backend/src/routes', (n) => /\.js$/.test(n)) },
  { name: '后端 data/**', files: walk(ROOT + '/backend/src/data', (n) => /\.js$/.test(n)) },
  { name: '后端 scripts/**', files: walk(ROOT + '/backend/scripts', (n) => /\.js$/.test(n)) },
  { name: '验证/生成脚本 proof/**', files: walk(ROOT + '/proof', (n) => /\.(js|cjs|mjs)$/.test(n)) },
  { name: '文档 docs/**/*.md', files: walk(ROOT + '/docs', (n) => /\.md$/.test(n)) },
]

console.log('════════ 代码与文档规模（不含 node_modules/dist）════════')
let totalCode = 0
let totalFiles = 0
for (const g of groups) {
  const lines = countLines(g.files)
  totalCode += lines
  totalFiles += g.files.length
  console.log(`  ${String(lines).padStart(6)} 行  ${String(g.files.length).padStart(4)} 个文件   ${g.name}`)
}
console.log('  ' + '─'.repeat(58))
console.log(`  ${String(totalCode).padStart(6)} 行  ${String(totalFiles).padStart(4)} 个文件   合计`)

// git 提交统计（作者维度）
console.log('')
console.log('════════ Git 提交统计（按作者）════════')
try {
  const out = execFileSync('git', ['shortlog', '-sn', '--all'], { cwd: ROOT, encoding: 'utf8' })
  out.trim().split('\n').forEach((l) => console.log('  ' + l.trim()))
  const total = execFileSync('git', ['rev-list', '--count', '--all'], { cwd: ROOT, encoding: 'utf8' }).trim()
  console.log('  提交总数(所有分支): ' + total)
  const first = execFileSync('git', ['log', '--reverse', '--format=%ad', '--date=short', '--all'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n')[0]
  const last = execFileSync('git', ['log', '-1', '--format=%ad', '--date=short'], { cwd: ROOT, encoding: 'utf8' }).trim()
  console.log(`  开发周期: ${first} ~ ${last}`)
} catch (e) { console.log('  ⚠️ git 统计失败: ' + e.message.slice(0, 90)) }

// 数据资产规模（学生自建数据集）
console.log('')
console.log('════════ 自建数据资产规模 ════════')
const dataFiles = [
  ['frontend/src/utils/cityChronicle.js', '全国城邑历代沿革 + 古称别名'],
  ['frontend/src/utils/geoCities.js', '全国城市经纬度与古称'],
  ['frontend/src/utils/almanac.js', '二十四节气七十二候与物候'],
  ['frontend/src/utils/shichen.js', '十二时辰养生雅事'],
  ['backend/src/data/poemFallback.js', '诗词搜索离线兜底库'],
  ['frontend/src/components/recognitionResult/localFallback.js', '拍照识器前端兜底文博库'],
  ['backend/src/utils/feihuaEngine.js', '飞花令引擎与令字库'],
]
for (const [rel, desc] of dataFiles) {
  const p = path.join(ROOT, rel)
  if (!fs.existsSync(p)) { console.log('  (缺失) ' + rel); continue }
  const t = fs.readFileSync(p, 'utf8')
  console.log(`  ${String(t.split(/\r?\n/).length).padStart(5)} 行  ${rel}`)
  console.log(`         ${desc}`)
}
