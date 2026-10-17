// 生成准确的接口清单（含挂载前缀），用于重写 README 的接口章节
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const FILES = ['authRoutes.js', 'poemRoutes.js', 'coze-api.js', 'deepseek-api.js', 'uploadRoutes.js']

const out = []
for (const f of FILES) {
  const t = fs.readFileSync(path.join(ROOT, 'backend/src/routes', f), 'utf8')
  const pref = (t.match(/prefix:\s*['"`]([^'"`]+)['"`]/) || [])[1] || ''
  const rows = []
  for (const m of t.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g)) {
    rows.push({ method: m[1].toUpperCase(), path: pref + m[2] })
  }
  out.push({ file: f, prefix: pref, rows })
}

let total = 0
for (const g of out) {
  console.log('\n### ' + g.file + '　(base: ' + (g.prefix || '无') + ')')
  for (const r of g.rows) {
    console.log('| `' + r.method + '` | `' + r.path + '` |')
    total++
  }
}
console.log('\n合计 ' + total + ' 条')

// 输出 markdown 片段便于直接贴进 README
const md = []
for (const g of out) {
  md.push('#### ' + g.prefix)
  md.push('')
  md.push('| 方法 | 路径 |')
  md.push('| :--- | :--- |')
  for (const r of g.rows) md.push('| `' + r.method + '` | `' + r.path + '` |')
  md.push('')
}
fs.writeFileSync(path.join(ROOT, 'proof', '_api-list.md'), md.join('\n'), 'utf8')
console.log('  已写入 proof/_api-list.md')
