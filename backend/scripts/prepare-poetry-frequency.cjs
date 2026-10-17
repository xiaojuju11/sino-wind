// Reproducible import of the explicitly selected Tang poetry and Song ci shards.
const fs = require('node:fs/promises')
const path = require('node:path')
const { promisify } = require('node:util')
const { execFile } = require('node:child_process')
const { createHash } = require('node:crypto')
const { gzipSync } = require('node:zlib')
const { Jieba } = require('@node-rs/jieba')
const { dict } = require('@node-rs/jieba/dict')
const OpenCC = require('opencc-js')
const run = promisify(execFile)
const revision = 'b8594f81a89752241442f2ce267d6f66f96704ee'
const root = path.resolve(__dirname, '..')
const cache = path.join(root, '.cache/poetry-frequency', revision)
const destination = path.join(root, 'data/poetry-frequency')
const normalize = OpenCC.Converter({ from: 't', to: 'cn' })
const jieba = Jieba.withDict(dict)
async function download(file) {
  const target = path.join(cache, file.replaceAll('/', '__'))
  try { return await fs.readFile(target) } catch { /* first download */ }
  const url = `https://raw.githubusercontent.com/chinese-poetry/chinese-poetry/${revision}/${file.split('/').map(encodeURIComponent).join('/')}`
  const args = ['-fLSs', '--retry', '3', '--connect-timeout', '20', '--max-time', '120']
  if (process.env.HTTPS_PROXY) args.push('--proxy', process.env.HTTPS_PROXY)
  await run(process.platform === 'win32' ? 'curl.exe' : 'curl', [...args, url, '-o', target + '.part'], { maxBuffer: 1024 * 1024 })
  await fs.rename(target + '.part', target)
  return fs.readFile(target)
}
async function main() {
  await fs.mkdir(cache, { recursive: true }); await fs.mkdir(destination, { recursive: true })
  const tree = JSON.parse(await fs.readFile(path.join(destination, 'sources.json'), 'utf8')).tree
  const files = tree.filter(x => /^(全唐诗\/poet\.tang\.\d+|宋词\/ci\.song\.\d+)\.json$/.test(x.path)).sort((a, b) => a.path.localeCompare(b.path, 'en'))
  if (files.length !== 80) throw Error('Unexpected source shard count')
  let index = 0
  const loaded = new Map()
  await Promise.all(Array.from({ length: 5 }, async () => {
    while (index < files.length) {
      const source = files[index++]
      const bytes = await download(source.path)
      const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
      if (blob !== source.sha) throw Error(`Source hash mismatch: ${source.path}`)
      loaded.set(source.path, JSON.parse(bytes))
      console.log(`Downloaded ${loaded.size}/${files.length}`)
    }
  }))
  const seen = new Set(), rows = [], sources = []
  let rawCount = 0, duplicateCount = 0, invalidCount = 0
  for (const source of files) {
    const sourceIndex = sources.length
    sources.push({ path: source.path, gitBlob: source.sha })
    loaded.get(source.path).forEach((entry, ordinal) => {
      rawCount++
      const original = entry.paragraphs
      if (!Array.isArray(original) || !original.length || original.some(x => typeof x !== 'string')) { invalidCount++; return }
      const author = normalize(entry.author || '佚名'), title = normalize(entry.title || entry.rhythmic || '无题')
      const paragraphs = original.map(normalize)
      if (!paragraphs.some(x => /\p{Script=Han}/u.test(x))) { invalidCount++; return }
      const key = JSON.stringify([author, title, paragraphs])
      if (seen.has(key)) { duplicateCount++; return }; seen.add(key)
      const id = createHash('sha256').update(source.path + ':' + ordinal).digest('hex').slice(0, 20)
      const tokens = paragraphs.flatMap(line => (line.match(/\p{Script=Han}+/gu) || []).flatMap(run => jieba.cut(run, false)))
      rows.push({ id, corpus: source.path.startsWith('全唐诗') ? 'tang' : 'song', author, title, paragraphs, original, tokens, sourceIndex, ordinal })
    })
  }
  const manifest = { schema: 1, revision, repository: 'https://github.com/chinese-poetry/chinese-poetry', license: 'MIT', files: sources,
    rawCount, duplicateCount, invalidCount, count: rows.length, counts: { tang: rows.filter(p => p.corpus === 'tang').length, song: rows.filter(p => p.corpus === 'song').length },
    method: '正文统计；OpenCC t→cn；jieba 2.0.4 精确模式 HMM=false；标点处分段分词；不统计标题、作者及标点。词频仅保留至少二字分词结果。' }
  const bytes = gzipSync(Buffer.from(JSON.stringify(rows)), { level: 9 })
  manifest.sha256 = createHash('sha256').update(bytes).digest('hex')
  await fs.writeFile(path.join(destination, 'corpus.json.gz'), bytes)
  await fs.writeFile(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
  await fs.writeFile(path.join(destination, 'LICENSE.chinese-poetry'), await download('LICENSE'))
  console.log(JSON.stringify({ count: manifest.count, counts: manifest.counts, duplicateCount, invalidCount, compressedBytes: bytes.length }))
}
main().catch(e => { console.error(e); process.exitCode = 1 })
