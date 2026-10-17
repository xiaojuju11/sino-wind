// 全量图片来源审计：枚举仓库内所有图片，标注尺寸、体积、代码引用位置
import fs from 'node:fs'
import path from 'node:path'

const ROOT = 'D:/sino-wind-taskB'
const IMG_EXT = /\.(png|jpe?g|webp|gif|svg|bmp|ico)$/i
const SKIP = new Set(['node_modules', '.git', 'dist', '.agents'])

const walk = (dir, out = []) => {
  for (const n of fs.readdirSync(dir)) {
    if (SKIP.has(n)) continue
    const p = path.join(dir, n)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else if (IMG_EXT.test(n)) out.push(p)
  }
  return out
}

// 收集所有可读文本文件（用于查引用）
const TEXT_EXT = /\.(jsx?|less|css|html|json|md|cjs|mjs|py)$/i
const textFiles = []
const walkText = (dir) => {
  for (const n of fs.readdirSync(dir)) {
    if (SKIP.has(n)) continue
    const p = path.join(dir, n)
    if (fs.statSync(p).isDirectory()) walkText(p)
    else if (TEXT_EXT.test(n)) textFiles.push(p)
  }
}
walkText(ROOT)

const texts = textFiles.map((f) => ({ f, rel: path.relative(ROOT, f).replace(/\\/g, '/'), t: fs.readFileSync(f, 'utf8') }))

const images = walk(ROOT).map((f) => {
  const rel = path.relative(ROOT, f).replace(/\\/g, '/')
  const stat = fs.statSync(f)
  const base = path.basename(f)
  // ⚠️ 引用判据：必须匹配**含扩展名的完整文件名**。
  //    上一版只搜「去扩展名的词干」，把 "vite" 之类短词命中了 vite.config.js 等
  //    大量无关文件，导致引用数虚高（vite.svg 被误报 34 处，实际 0 处）。
  const refs = []
  for (const { rel: trel, t } of texts) {
    if (trel === rel) continue
    if (t.includes(base)) refs.push(trel)
  }
  const sourceDocs = refs.filter((r) => /\.(md)$/i.test(r))
  return {
    rel,
    base,
    dir: path.dirname(rel).replace(/\\/g, '/'),
    bytes: stat.size,
    kb: Math.round(stat.size / 1024),
    refs,
    sourceDocs,
    refCount: refs.length,
  }
})

images.sort((a, b) => a.rel.localeCompare(b.rel))

// 按目录汇总
const byDir = new Map()
for (const im of images) {
  const d = im.dir
  const cur = byDir.get(d) || { n: 0, bytes: 0 }
  cur.n++
  cur.bytes += im.bytes
  byDir.set(d, cur)
}

console.log('════════ 图片总览 ════════')
console.log('  图片总数: ' + images.length + ' 张, 合计 ' + (images.reduce((s, x) => s + x.bytes, 0) / 1048576).toFixed(1) + 'MB')
console.log('')
console.log('  按目录:')
for (const [d, v] of [...byDir.entries()].sort((a, b) => b[1].bytes - a[1].bytes)) {
  console.log('    ' + String(v.n).padStart(3) + ' 张 ' + (v.bytes / 1048576).toFixed(1).padStart(6) + 'MB  ' + d)
}

console.log('')
console.log('════════ 逐张明细（含引用次数）════════')
for (const im of images) {
  const flag = im.refCount === 0 ? '⚠️ 零引用' : (im.refCount + ' 处引用')
  console.log('  ' + im.rel)
  console.log('      ' + im.kb + 'KB   ' + flag + (im.sourceDocs.length ? '   来源文档: ' + im.sourceDocs.slice(0, 2).join(', ') : ''))
}

// 零引用清单（可能是遗留素材）
const orphan = images.filter((x) => x.refCount === 0)
console.log('')
console.log('════════ 零代码引用的图片（' + orphan.length + ' 张，' + (orphan.reduce((s, x) => s + x.bytes, 0) / 1048576).toFixed(1) + 'MB）════════')
orphan.forEach((x) => console.log('  ' + x.rel + '   ' + x.kb + 'KB'))

fs.writeFileSync(path.join(ROOT, 'proof', '_img-inventory.json'), JSON.stringify(images, null, 2), 'utf8')
console.log('')
console.log('  明细已写入 proof/_img-inventory.json')
