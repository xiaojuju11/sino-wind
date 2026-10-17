/**
 * 全库脏数据扫描：查找丢失反斜杠的 \uXXXX 转义串
 * 例：'\u7ae5\u751f'（童生）被误存为 "u7ae5u751f"
 *
 * 用法：cd backend && node ../proof/diag-dirty-data.cjs
 *       cd backend && node ../proof/diag-dirty-data.cjs --fix
 */
const path = require('node:path')
const { createRequire } = require('node:module')
const backendDir = path.resolve(__dirname, '..', 'backend')
process.chdir(backendDir)
// ⚠️ process.chdir 不改变模块解析基准；须用 createRequire 以 backend 为基准加载依赖
const backendRequire = createRequire(path.join(backendDir, 'noop.js'))
backendRequire('dotenv').config({ path: '.env' })
backendRequire('dotenv').config({ path: '.env.local', override: true })
const mysql = backendRequire('mysql2/promise')

const PATTERN = /(^|[^\\])u[0-9a-fA-F]{4}(u[0-9a-fA-F]{4})+/
const FIX = process.argv.includes('--fix')

// 已知的转义串 → 正确汉字（避免自动解码，人工确认后登记）
const KNOWN = {
  u7ae5u751f: '童生',
}

function decode(val) {
  if (KNOWN[val]) return KNOWN[val]
  // 兜底：把 uXXXX 还原成 \uXXXX 再解码
  try {
    const restored = val.replace(/(^|[^\\])u([0-9a-fA-F]{4})/g, (_, pre, hex) => pre + '\\u' + hex)
    const out = JSON.parse('"' + restored + '"')
    return out === val ? null : out
  } catch {
    return null
  }
}

;(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'parent_kid_education',
  })
  const [tables] = await c.query('SHOW TABLES')
  let hits = 0
  let fixed = 0

  for (const row of tables) {
    const t = Object.values(row)[0]
    const [cols] = await c.query('SHOW COLUMNS FROM `' + t + '`')
    const textCols = cols.filter((x) => /char|text|json/i.test(x.Type)).map((x) => x.Field)
    if (!textCols.length) continue
    const [rows] = await c.query('SELECT * FROM `' + t + '`')
    for (const r of rows) {
      for (const col of textCols) {
        const v = r[col]
        if (typeof v !== 'string' || !PATTERN.test(v)) continue
        hits++
        const target = decode(v)
        console.log(`  ⚠️ ${t}.${col}  id=${r.id}  = ${JSON.stringify(v)}` + (target ? `  → 应为 ${JSON.stringify(target)}` : '  （无法自动判定）'))
        if (FIX && target) {
          const [res] = await c.query(`UPDATE \`${t}\` SET \`${col}\`=? WHERE id=? AND \`${col}\`=?`, [target, r.id, v])
          if (res.affectedRows) {
            fixed++
            console.log(`       ✅ 已修正`)
          }
        }
      }
    }
  }

  console.log('')
  if (hits === 0) console.log('  ✅ 未发现转义脏数据')
  else console.log(`  共 ${hits} 处` + (FIX ? `，已修正 ${fixed} 处` : '（加 --fix 可自动修正已登记项）'))
  await c.end()
})().catch((e) => {
  console.log('  ⚠️ ' + e.message.slice(0, 160))
  process.exit(1)
})
