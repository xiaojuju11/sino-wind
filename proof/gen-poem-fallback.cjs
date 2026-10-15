// 生成 backend/src/data/poemFallback.js —— 搜索兜底诗词库
// 数据源：backend/src/data/feihuaCorpus.js 的 works 原文（公有领域，已带出处）
// 为什么这样做：上游诗泉部署实例的搜索端点不可用（8 种参数/端点变体实测均 400/404），
// 搜索只能靠本地兜底；而原兜底仅 2 首（静夜思/春晓），搜「山」「水」「酒」返回空。
// 本脚本从既有 84 首作品原文重建完整篇（保留原诗文序），供 poemController 搜索兜底使用。
const fs = require('node:fs')
const path = require('node:path')

const CORPUS = 'D:/sino-wind-taskB/backend/src/data/feihuaCorpus.js'
const OUT = 'D:/sino-wind-taskB/backend/src/data/poemFallback.js'

const src = fs.readFileSync(CORPUS, 'utf8')
const block = /const works = \[([\s\S]*?)\n\]/.exec(src)
if (!block) throw new Error('未能解析 works 数组')

// 逐条解析 ['author','title','text']；文本用非贪婪匹配到下一个 '],
const entries = []
const re = /\[\s*'([^']*)'\s*,\s*'([^']*)'\s*,\s*'([^']*)'\s*\]/g
let m
while ((m = re.exec(block[1])) !== null) entries.push({ author: m[1], title: m[2], text: m[3] })
if (entries.length < 80) throw new Error(`条目数异常：${entries.length}`)

// 朝代推断（与 feihuaCorpus 同规则，保持全站一致）
const SONG = new Set(['苏轼', '李清照', '朱熹', '王安石', '陆游', '辛弃疾', '杨万里', '叶绍翁', '欧阳修', '晏殊', '柳永', '秦观', '周邦彦', '贺铸'])
const dynastyOf = (a) => (a === '王阳明' ? '明' : SONG.has(a) ? '宋' : a === '李煜' ? '南唐' : '唐')

// 按古典标点断句，但【保持原文顺序】（原实现 split 后顺序虽在，但下游按行去重会打乱语义）
const splitLines = (text) => text.split(/[，。！？；]/u).map(s => s.trim()).filter(Boolean)

// 语料里少数「词」的标题带调名，正文含换行，统一清理
const cleanTitle = (t) => t.replace(/\s+/g, '').trim()

const poems = entries.map(({ author, title, text }) => {
  const lines = splitLines(text)
  const content = []
  // 每两句组成一个「对句」展示单元（与原 UI 的 content[] 语义一致：一行一联）
  for (let i = 0; i < lines.length; i += 2) {
    const a = lines[i]
    const b = lines[i + 1]
    content.push(b ? `${a}，${b}。` : `${a}。`)
  }
  return {
    id: 'corpus-' + Buffer.from(`${author}|${title}`).toString('hex').slice(0, 16),
    title: cleanTitle(title),
    author,
    dynasty: dynastyOf(author),
    content,
    // 兜底库自带的简析标记，前端据 degraded 决定是否展示
    appreciation: '',
    fullText: text,
  }
})

const header = `// ⚠️ 本文件由 proof/gen-poem-fallback.cjs 生成，请勿手改。
// 数据源：src/data/feihuaCorpus.js 的作品原文（公有领域），保留原诗文序与出处。
// 用途：poemController 搜索的本地兜底库。上游诗泉部署实例的检索端点不可用
//   （/api/search 与 /api/poems/search 等 8 种变体实测均 400/404），故搜索依赖本库。
// 维护：扩充诗词请改 feihuaCorpus.js，然后重跑生成脚本。
`

const body = `module.exports = ${JSON.stringify(poems, null, 2).replace(/"([a-zA-Z]+)":/g, '$1:')}\n`

fs.writeFileSync(OUT, header + body, 'utf8')

console.log(`已生成 ${OUT}`)
console.log(`  作品数: ${poems.length}`)
const dyn = {}
for (const p of poems) dyn[p.dynasty] = (dyn[p.dynasty] || 0) + 1
console.log(`  朝代: ${JSON.stringify(dyn)}`)
console.log(`  总联数: ${poems.reduce((n, p) => n + p.content.length, 0)}`)
console.log('\n  关键词覆盖（可命中作品数）:')
for (const kw of ['月', '山', '水', '春', '风', '花', '江', '云', '雨', '夜', '酒', '秋', '雪', '柳', '鸟', '草', '天', '日', '心', '愁']) {
  const n = poems.filter(p => (p.fullText + p.title + p.author).includes(kw)).length
  console.log(`    ${kw} → ${String(n).padStart(2)} 首${n < 10 ? '  ⚠️' : ''}`)
}
console.log('\n  样例:')
for (const p of poems.slice(0, 3)) console.log(`    《${p.title}》${p.author}（${p.dynasty}） ${p.content.join(' ')}`)

