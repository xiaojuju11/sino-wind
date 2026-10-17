// 生成准确的接口清单（含挂载前缀），用于维护 README 接口章节
// ⚠️ 自动扫描 backend/src/routes/ 下全部路由文件，不硬编码文件名
//    （曾硬编码 5 个文件，主干新增 frequencyRoutes/sceneRoutes 后计数偏低）
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const ROUTE_DIR = path.join(ROOT, 'backend/src/routes')
const MOUNT_FILE = path.join(ROOT, 'backend/src/index.js')

// 只统计实际被 index.js 挂载的路由文件
const indexSrc = fs.readFileSync(MOUNT_FILE, 'utf8')
const mounted = new Set()
for (const m of indexSrc.matchAll(/require\(\s*['"]\.\/routes\/([^'"]+)['"]\s*\)/g)) mounted.add(m[1])
for (const m of indexSrc.matchAll(/app\.use\(\s*\w*[Rr]outes\.routes\(\)/g)) mounted.add('__used__')

const allFiles = fs.readdirSync(ROUTE_DIR).filter((n) => /\.js$/.test(n))
const usedFiles = allFiles.filter((f) => mounted.has(f))

if (mounted.size && !mounted.has('__used__')) {
  console.log('  ⚠️ 未在 index.js 中检测到 app.use(*Routes.routes())，将统计全部路由文件')
}

const out = []
let total = 0
for (const f of usedFiles.sort()) {
  const t = fs.readFileSync(path.join(ROUTE_DIR, f), 'utf8')
  const pref = (t.match(/prefix:\s*['"`]([^'"`]+)['"`]/) || [])[1] || ''
  const rows = []
  for (const m of t.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g)) {
    rows.push({ method: m[1].toUpperCase(), path: pref + m[2] })
    total++
  }
  out.push({ file: f, prefix: pref, rows })
}

console.log('=== 已挂载的路由文件 ===')
for (const g of out) {
  console.log('  ' + g.file.padEnd(24) + String(g.rows.length).padStart(2) + ' 条   前缀: ' + (g.prefix || '无'))
}
console.log('\n  合计 ' + total + ' 条接口，' + out.length + ' 个路由模块')

const md = []
for (const g of out) {
  md.push('#### ' + (g.prefix || g.file))
  md.push('')
  md.push('| 方法 | 路径 |')
  md.push('| :--- | :--- |')
  for (const r of g.rows) md.push('| `' + r.method + '` | `' + r.path + '` |')
  md.push('')
}
fs.writeFileSync(path.join(ROOT, 'proof', '_api-list.md'), md.join('\n'), 'utf8')
console.log('  已写入 proof/_api-list.md')

// 输出新增路由（供核对 README 是否遗漏）
const readme = fs.readFileSync(path.join(ROOT, 'readme.md'), 'utf8')
const missing = []
for (const g of out) {
  for (const r of g.rows) {
    if (!readme.includes(r.path)) missing.push(r.method + ' ' + r.path)
  }
}
console.log('\n=== README 未提及的接口 (' + missing.length + ' 条) ===')
missing.forEach((m) => console.log('  ' + m))
