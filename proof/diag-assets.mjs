// 清点字体、图标与图片资产（合规清单用）
import fs from 'node:fs'
import path from 'node:path'

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

// ── 字体 ──
console.log('════════ 字体（font-family 去重）════════')
const fonts = new Map()
for (const f of walk(ROOT + '/frontend/src', (n) => /\.(less|css|jsx?)$/.test(n))) {
  const t = fs.readFileSync(f, 'utf8')
  for (const m of t.matchAll(/font-family\s*:\s*([^;}\n]+)/g)) {
    for (const name of m[1].split(',').map((s) => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean)) {
      if (/^(inherit|initial|unset|var\(|serif|sans-serif|monospace|-apple-system)/.test(name)) continue
      fonts.set(name, (fonts.get(name) || 0) + 1)
    }
  }
}
;[...fonts.entries()].sort((a, b) => b[1] - a[1]).forEach(([n, c]) => console.log(`  ${n.padEnd(24)} ${c} 次`))
console.log(`  合计 ${fonts.size} 个字体名`)

const fontFiles = walk(ROOT + '/frontend', (n) => /\.(woff2?|ttf|otf|eot)$/i.test(n))
console.log('')
console.log('  本地字体文件: ' + (fontFiles.length ? fontFiles.map((f) => path.relative(ROOT, f)).join(', ') : '无 → 全部依赖操作系统自带字体'))

// ── 图片资产（按目录汇总）──
console.log('')
console.log('════════ 图片资产（按目录汇总）════════')
for (const dir of ['frontend/public', 'frontend/src/assets', 'docs/design']) {
  const imgs = walk(ROOT + '/' + dir, (n) => /\.(png|jpe?g|webp|gif|svg)$/i.test(n))
  if (!imgs.length) { console.log(`  ${dir}: 无`); continue }
  const byDir = new Map()
  let total = 0
  for (const f of imgs) {
    const d = path.dirname(path.relative(ROOT, f)).replace(/\\/g, '/')
    const sz = fs.statSync(f).size
    total += sz
    const cur = byDir.get(d) || { n: 0, sz: 0, biggest: '' , big: 0 }
    cur.n++; cur.sz += sz
    if (sz > cur.big) { cur.big = sz; cur.biggest = path.basename(f) }
    byDir.set(d, cur)
  }
  console.log(`  ── ${dir}  共 ${imgs.length} 张 / ${(total / 1048576).toFixed(1)}MB`)
  ;[...byDir.entries()].sort((a, b) => b[1].sz - a[1].sz).slice(0, 10).forEach(([d, v]) => {
    console.log(`      ${String(v.n).padStart(4)} 张 ${(v.sz / 1048576).toFixed(1).padStart(6)}MB  ${d}`)
    if (v.biggest) console.log(`            最大: ${v.biggest} (${(v.big / 1024).toFixed(0)}KB)`)
  })
}

// ── 音频资产 ──
console.log('')
const audio = walk(ROOT + '/frontend', (n) => /\.(mp3|wav|ogg|m4a|aac)$/i.test(n))
console.log('════════ 音频资产 ════════')
console.log('  本地音频文件: ' + (audio.length ? audio.map((f) => path.relative(ROOT, f)).join(', ') : '无'))
