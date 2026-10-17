// 精确核对：每个产品素材在「产品代码」中的真实引用（含 .less）
// 产品代码 = frontend/src/**, frontend/index.html, frontend/public/manifest.json, frontend/tests/**
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const inv = JSON.parse(fs.readFileSync(path.join(ROOT, 'proof', '_img-inventory.json'), 'utf8'))

// 收集产品代码（排除我自己生成的审计脚本目录）
const files = []
const collect = (d) => {
  for (const n of fs.readdirSync(d)) {
    if (['node_modules', 'dist'].includes(n)) continue
    const p = path.join(d, n)
    if (fs.statSync(p).isDirectory()) collect(p)
    else if (/\.(jsx?|less|css|html|json)$/.test(n)) files.push(p)
  }
}
collect(path.join(ROOT, 'frontend/src'))
collect(path.join(ROOT, 'frontend/tests'))
files.push(path.join(ROOT, 'frontend/index.html'))
files.push(path.join(ROOT, 'frontend/public/manifest.json'))

const code = files
  .filter((f) => fs.existsSync(f))
  .map((f) => ({ rel: path.relative(ROOT, f).replace(/\\/g, '/'), lines: fs.readFileSync(f, 'utf8').split(/\r?\n/) }))

const prod = inv.filter((x) => x.rel.startsWith('frontend/public'))
const rows = []

for (const it of prod) {
  const base = it.base
  const hits = []
  for (const c of code) {
    c.lines.forEach((l, i) => { if (l.includes(base)) hits.push(`${c.rel}:${i + 1}`) })
  }
  // 动态引用：scholar-scenes 由 scholarScenes.js 按 key 拼路径
  let dyn = []
  if (it.rel.includes('assets/scholar-scenes/')) {
    for (const c of code) {
      c.lines.forEach((l, i) => {
        if (l.includes('assets/scholar-scenes/') && l.includes('${')) dyn.push(`${c.rel}:${i + 1}`)
      })
    }
  }
  rows.push({ rel: it.rel, base, kb: it.kb, hits, dyn, kind: hits.length ? 'exact' : (dyn.length ? 'dynamic' : 'unused') })
}

rows.sort((a, b) => a.rel.localeCompare(b.rel))

const byKind = { exact: [], dynamic: [], unused: [] }
for (const r of rows) byKind[r.kind].push(r)

for (const k of ['exact', 'dynamic', 'unused']) {
  const label = { exact: '静态引用（文件名在代码中字面出现）', dynamic: '动态引用（按 key 拼路径）', unused: '★ 产品代码中零引用' }[k]
  const sz = byKind[k].reduce((s, x) => s + x.kb, 0)
  console.log(`\n════ ${label} · ${byKind[k].length} 张 / ${(sz / 1024).toFixed(1)}MB ════`)
  for (const r of byKind[k]) {
    console.log(`  ${r.rel.replace('frontend/public/', '').padEnd(50)} ${String(r.kb).padStart(5)}KB`)
    if (r.hits.length) console.log(`      → ${r.hits.slice(0, 3).join('  ')}${r.hits.length > 3 ? `  …共 ${r.hits.length} 处` : ''}`)
    if (r.dyn.length) console.log(`      → ${r.dyn[0]}（按诗人 key 拼路径）`)
  }
}

fs.writeFileSync(path.join(ROOT, 'proof', '_img-usage.json'), JSON.stringify(rows, null, 2), 'utf8')
console.log('\n  明细已写入 proof/_img-usage.json')
