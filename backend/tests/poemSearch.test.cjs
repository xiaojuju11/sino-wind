const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
function searchApi(local, ai) {
  const module = { exports: {} }, calls = []
  const dependencies = {
    axios: { get: async () => { throw Error('offline') } },
    '../config/db': {}, '../data/poemFallback': local,
    './deepseekController': { searchPoemsDeepSeek: async q => { calls.push(q); return ai } },
  }
  vm.runInNewContext(fs.readFileSync(path.resolve(__dirname, '../src/controllers/poemController.js'), 'utf8'), {
    module, require: key => dependencies[key], AbortSignal, setTimeout,
    console: { warn() {} },
  })
  return { search: module.exports.search, calls }
}
const poem = (title, author = '曹操') => ({ id: title, title, author, dynasty: '汉', content: ['东临碣石，以观沧海。'] })
test('literal local title search completes without AI and excludes merely related titles', async () => {
  const api = searchApi([poem('观沧海'), poem('观沧海有感')], [])
  const ctx = { query: { q: '观沧海' } }
  await api.search(ctx)
  assert.deepEqual(Array.from(ctx.body.data, p => p.title), ['观沧海'])
  assert.equal(api.calls.length, 0)
})
test('an exact AI title excludes unrelated thematic recommendations', async () => {
  const api = searchApi([], [poem('观沧海'), poem('登鹳雀楼', '王之涣'), poem('望岳', '杜甫')])
  const ctx = { query: { q: '《观沧海》' } }
  await api.search(ctx)
  assert.deepEqual(Array.from(ctx.body.data, p => p.title), ['观沧海'])
})
test('author search uses corpus matches without model recommendations', async () => {
  const api = searchApi([poem('观沧海'), poem('短歌行'), poem('望岳', '杜甫')], [])
  const ctx = { query: { q: '曹操' } }
  await api.search(ctx)
  assert.equal(ctx.body.data.length, 2)
  assert.equal(api.calls.length, 0)
})
