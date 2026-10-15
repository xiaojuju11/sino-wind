// 对比 team/main 与本地分支的别名表（用 Node 从 git 直接取，避免 PowerShell 重定向的编码问题）
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const mainSrc = execFileSync('git', ['show', 'team/main:frontend/src/utils/cityChronicle.js'], {
  cwd: 'D:/sino-wind-taskB', maxBuffer: 32 * 1024 * 1024,
}).toString('utf8')
const mineSrc = readFileSync('D:/sino-wind-taskB/frontend/src/utils/cityChronicle.js', 'utf8')

function parse(t) {
  const i = t.indexOf('export const CITY_ALIAS = {')
  const j = t.indexOf('\n}', i)
  const map = {}
  for (const m of t.slice(i, j).matchAll(/([^\s{,}]+):\s*'([^']*)'/g)) map[m[1]] = m[2]
  const keys = new Set([...t.matchAll(/^  ([^\s:{}]+): \[\n/gm)].map((m) => m[1]))
  return { map, keys, hasProv: t.includes('PROVINCE_CAPITAL') }
}

const M = parse(mainSrc)
const L = parse(mineSrc)

console.log('  team/main: 别名 ' + Object.keys(M.map).length + ' 条   省名映射 ' + (M.hasProv ? '有' : '无'))
console.log('  本地分支 : 别名 ' + Object.keys(L.map).length + ' 条   省名映射 ' + (L.hasProv ? '有' : '无'))
console.log('')

console.log('  ── 主干上那 8 处自指错误是否还在 ──')
let bad = 0
for (const k of ['南京', '西安', '酒泉', '北海', '揭阳', '辽阳', '泰州', '咸阳']) {
  const v = M.map[k]
  const isSelf = v === k
  const ok = v === undefined || isSelf
  if (!ok) bad++
  console.log('    ' + (ok ? '✅' : '❌') + ' ' + k.padEnd(4) + " → '" + (v ?? '(无此键，查表直接命中自身)') + "'")
}
console.log('    自指错误合计:', bad)
console.log('')

console.log('  ── 主干是否缺「四川省名检索」 ──')
console.log('    PROVINCE_CAPITAL:', M.hasProv ? '有' : '❌ 无 → 搜「四川」无结果')
console.log('')

const onlyMine = Object.keys(L.map).filter((k) => !(k in M.map))
console.log('  ── 本地比主干多出的别名 ──')
console.log('    数量:', onlyMine.length)
console.log('    ' + onlyMine.slice(0, 40).join(' '))
