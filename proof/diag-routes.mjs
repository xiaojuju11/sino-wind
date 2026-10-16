// 列出实际注册的后端路由（权威依据，用于核对 README 的滞后声明）
import fs from 'node:fs'
import path from 'node:path'

const dir = 'D:/sino-wind-taskB/backend/src/routes'
const all = []
for (const f of fs.readdirSync(dir)) {
  const t = fs.readFileSync(path.join(dir, f), 'utf8')
  const routes = [...t.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g)].map((m) => m[1].toUpperCase() + ' ' + m[2])
  if (routes.length) {
    console.log('  ── ' + f + '  (' + routes.length + ' 条)')
    routes.forEach((r) => console.log('     ' + r))
    all.push(...routes)
  }
}
console.log('')
console.log('  路由合计: ' + all.length + ' 条')

// 对比 README 声明的接口
const readme = fs.readFileSync('D:/sino-wind-taskB/readme.md', 'utf8')
const claimed = [...readme.matchAll(/\|\s*`(\/api\/[^`]+)`/g)].map((m) => m[1])
console.log('')
console.log('  真实路由路径集合（去掉方法）:')
const realPaths = new Set(all.map((r) => r.split(' ')[1]))
console.log('    ' + [...realPaths].sort().join('\n    '))
