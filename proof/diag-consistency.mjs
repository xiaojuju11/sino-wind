// 一致性核查：README / TRD 声称 vs 实际
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const real = new Set()
for (const f of fs.readdirSync(path.join(ROOT, 'backend/src/routes'))) {
  const t = fs.readFileSync(path.join(ROOT, 'backend/src/routes', f), 'utf8')
  for (const m of t.matchAll(/router\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)/g)) real.add(m[2])
}
const readme = fs.readFileSync(path.join(ROOT, 'readme.md'), 'utf8')
const claimed = [...readme.matchAll(/`(\/api\/[^`]+)`/g)].map((m) => m[1])

console.log('=== README 接口声明核查 ===')
console.log('  README 声明: ' + claimed.length + ' 条   实际路由: ' + real.size + ' 条')
const bad = []
for (const c of claimed) {
  const tail = c.replace(/^\/api\//, '').split('/').filter(Boolean).pop() || ''
  const hit = [...real].some((x) => x.includes(tail))
  if (!hit) bad.push(c)
}
console.log('  README 声明但实际不存在: ' + (bad.length ? bad.join('  ') : '无'))

console.log('')
console.log('=== 技术版本核查（README/TRD 声称 vs package.json）===')
const fp = JSON.parse(fs.readFileSync(path.join(ROOT, 'frontend/package.json'), 'utf8'))
const bp = JSON.parse(fs.readFileSync(path.join(ROOT, 'backend/package.json'), 'utf8'))
const rows = [
  ['React', '19.2.0', fp.dependencies.react],
  ['Vite', '7.3.0', fp.devDependencies.vite],
  ['AntD Mobile', '5.42.3', fp.dependencies['antd-mobile']],
  ['React Router', '7.11.0', fp.dependencies['react-router-dom']],
  ['Less', '4.5.1', fp.devDependencies.less],
  ['Koa', '3.1.1', bp.dependencies.koa],
  ['mysql2', '3.16.0', bp.dependencies.mysql2],
]
for (const [name, doc, pkg] of rows) {
  const norm = (s) => String(s).replace(/[^0-9.]/g, '')
  const ok = norm(doc) === norm(pkg)
  console.log('  ' + (ok ? '✅' : '⚠️') + ' ' + name.padEnd(16) + ' 文档: ' + doc.padEnd(10) + ' 实际: ' + pkg)
}

console.log('')
console.log('=== TRD 中的旧版本号（Koa 2 / React 19.0.0 / Less 4.2.0）===')
const trd = fs.readFileSync(path.join(ROOT, 'docs/TRD_GUFENG_OVERHAUL.md'), 'utf8')
for (const k of ['Koa 2', 'v2.15.0', 'v19.0.0', 'v4.2.0', 'v5.39.0']) {
  const n = (trd.match(new RegExp(k.replace('.', '\\.'), 'g')) || []).length
  if (n) console.log('  仍出现 ' + n + ' 次: ' + k)
}

console.log('')
console.log('=== 其它待办核查 ===')
const all = []
const walk = (d) => { for (const n of fs.readdirSync(d)) { if (['node_modules', '.git', 'dist'].includes(n)) continue; const p = path.join(d, n); if (fs.statSync(p).isDirectory()) walk(p); else all.push(p) } }
walk(ROOT + '/frontend/src')
console.log('  LICENSE 文件: ' + (fs.readdirSync(ROOT).some((n) => /^LICEN[SC]E/i.test(n)) ? '存在' : '❌ 仍无（backend 标 ISC、README 标 MIT）'))
const fq = fs.readFileSync(path.join(ROOT, 'backend/src/utils/feihuaEngine.js'), 'utf8')
const m = fq.match(/'心'[^\n]*?(\d+)/)
const rules = fs.statSync(path.join(ROOT, 'backend/src/utils/feihuaEngine.js'))
console.log('  飞花令「心」字句数偏薄: 见引擎注释（已知问题）')
const distJs = fs.existsSync(path.join(ROOT, 'frontend/dist/assets'))
  ? fs.readdirSync(path.join(ROOT, 'frontend/dist/assets')).filter((n) => /^index-.*\.js$/.test(n))
  : []
for (const f of distJs) console.log('  主 chunk ' + f + ': ' + Math.round(fs.statSync(path.join(ROOT, 'frontend/dist/assets', f)).size / 1024) + 'KB')
