const { parentPort } = require('node:worker_threads')
const fs = require('node:fs')
const path = require('node:path')
const { gunzipSync } = require('node:zlib')
const { createHash } = require('node:crypto')
const { analyze, contexts } = require('./frequencyEngine.cjs')
const root = path.resolve(__dirname, '../../data/poetry-frequency')
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'))
const bytes = fs.readFileSync(path.join(root, 'corpus.json.gz'))
if (createHash('sha256').update(bytes).digest('hex') !== manifest.sha256) throw Error('诗库校验失败，请重新准备语料')
const rows = JSON.parse(gunzipSync(bytes)), byId = new Map(rows.map(p => [p.id, p]))
const authorCounts = new Map()
for (const p of rows) {
  const key = p.corpus + ':' + p.author
  const entry = authorCounts.get(key) || { corpus: p.corpus, name: p.author, count: 0 }; entry.count++; authorCounts.set(key, entry)
}
const authors = [...authorCounts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'zh-CN'))
const cache = new Map()
parentPort.on('message', ({ id, kind, query }) => {
  try {
    let result
    if (kind === 'meta') result = { count: manifest.count, counts: manifest.counts, revision: manifest.revision, method: manifest.method, authors }
    else if (kind === 'poem') {
      const poem = byId.get(query.id)
      if (!poem) throw Object.assign(Error('未找到此篇'), { status: 404 })
      const { tokens, ...rest } = poem
      result = { ...rest, source: `https://github.com/chinese-poetry/chinese-poetry/blob/${manifest.revision}/${manifest.files[poem.sourceIndex].path.split('/').map(encodeURIComponent).join('/')}` }
    } else if (kind === 'contexts') result = contexts(rows, query)
    else {
      const key = JSON.stringify(query)
      result = cache.get(key)
      if (!result) {
        result = analyze(rows, query)
        if (cache.size >= 20) cache.delete(cache.keys().next().value)
        cache.set(key, result)
      }
    }
    parentPort.postMessage({ id, result })
  } catch (error) { parentPort.postMessage({ id, error: error.message, status: error.status || 500 }) }
})
