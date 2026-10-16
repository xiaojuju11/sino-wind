import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../frontend/src')
const FRONTEND_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '../frontend')
const files = []
;(function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(jsx?|less)$/.test(n)) files.push(p)
  }
})(ROOT)
console.log('  扫描文件:', files.length)
console.log('')

const findings = { unguarded: [], imgNoAlt: [], keyIndex: [], consoleLog: [], hardcodedLocalhost: [], httpPlain: [] }

for (const f of files) {
  const rel = relative(FRONTEND_DIR, f).replace(/\\/g, '/')
  const t = readFileSync(f, 'utf8')
  const lines = t.split(/\r?\n/)

  lines.forEach((l, i) => {
    // 明文 http 外链
    if (/https?:\/\/[^\s'"]+/.test(l) && /http:\/\//.test(l) && !/localhost|127\.0\.0\.1|http:\/\/www\.w3\.org/.test(l)) {
      findings.httpPlain.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`)
    }
    // 硬编码 localhost（应走代理/环境变量）
    if (/['"]http:\/\/(localhost|127\.0\.0\.1):\d+/.test(l) && !/vite\.config|\.test\./.test(rel)) {
      findings.hardcodedLocalhost.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`)
    }
    // 列表 key 用下标（React 反模式，且本 PR 大量列表）
    if (/key=\{i\}|key=\{index\}|key=\{idx\}/.test(l)) findings.keyIndex.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`)
    // 遗留 console
    if (/console\.(log|debug)\(/.test(l)) findings.consoleLog.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`)
    // 未做空值保护的 .length / .map（可疑：可能对 undefined 调用）
    if (/\.\w+\.length\b/.test(l) && !/(\?\.|&&|\|\||typeof|\?\?)/.test(l) && /map|length|slice/.test(l)) {
      findings.unguarded.push(`${rel}:${i + 1}  ${l.trim().slice(0, 90)}`)
    }
  })
}

const show = (title, arr, limit = 6) => {
  console.log(`── ${title}（${arr.length}）──`)
  if (!arr.length) console.log('   ✅ 无')
  else arr.slice(0, limit).forEach((x) => console.log('   ' + x))
  if (arr.length > limit) console.log(`   …另有 ${arr.length - limit} 处`)
  console.log('')
}

show('明文 HTTP 外链（HTTPS 部署会拦）', findings.httpPlain)
show('硬编码 localhost 地址', findings.hardcodedLocalhost)
show('列表 key 用下标（React 反模式）', findings.keyIndex)
show('遗留 console.log/debug', findings.consoleLog)
show('可疑的未保护属性访问', findings.unguarded, 8)
