const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')

function gateway({ env = { COZE_API_TOKEN: 'test-token' }, post, execute } = {}) {
  const calls = [], counts = [], module = { exports: {} }
  const filename = path.resolve(__dirname, '../src/controllers/cozeController.js')
  const dependencies = {
    axios: { post: async (...args) => { calls.push(args); return post(...args) } },
    '../config/db': { execute: async (...args) => { counts.push(args); return execute?.(...args) } },
    dotenv: { config() {} },
  }
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), {
    require: name => dependencies[name], module, process: { env },
    console: { error() {}, warn() {} }, AbortSignal,
  }, { filename })
  return { recognize: module.exports.recognition, calls, counts }
}
const imageA = 'data:image/png;base64,Y3Vw'
const imageB = 'data:image/jpeg;base64,dmFzZQ=='
const result = name => ({ name, dynasty: '宋代', description: `${name}的考释`, score: 90 })
const context = img => ({ userId: 7, request: { body: { img } } })

test('missing Coze credentials reports unavailable without returning a fixed artifact', async () => {
  const api = gateway({ env: {} }), ctx = context(imageA)
  await api.recognize(ctx)
  assert.equal(ctx.status, 503)
  assert.equal(ctx.body.code, 0)
  assert.equal(ctx.body.error, 'COZE_NOT_CONFIGURED')
  assert.equal(ctx.body.data, undefined)
  assert.equal(api.calls.length + api.counts.length, 0)
})

test('each image reaches Coze unchanged and only actual results increment the count', async () => {
  const api = gateway({ post: async (_url, body) => ({ data: result(body.image === imageA ? '茶盏' : '花瓶') }) })
  const a = context(imageA), b = context(imageB)
  await api.recognize(a); await api.recognize(b)
  assert.equal(a.body.data.name, '茶盏')
  assert.equal(b.body.data.name, '花瓶')
  assert.equal(api.calls[0][1].image, imageA)
  assert.equal(api.calls[1][1].image, imageB)
  assert.equal(api.calls[0][2].timeout, 60000)
  assert.equal(api.counts.length, 2)
})

for (const [label, upstream, status, error] of [
  ['timeout', { code: 'ECONNABORTED' }, 504, 'COZE_TIMEOUT'],
  ['DNS failure', { code: 'ENOTFOUND' }, 502, 'COZE_UNAVAILABLE'],
  ['invalid token', { response: { status: 401 } }, 502, 'COZE_AUTH_FAILED'],
  ['rate limit', { response: { status: 429 } }, 503, 'COZE_RATE_LIMITED'],
]) {
  test(`${label} is an explicit failure, never a successful fixed answer`, async () => {
    const api = gateway({ post: async () => { throw upstream } }), ctx = context(imageA)
    await api.recognize(ctx)
    assert.equal(ctx.status, status)
    assert.equal(ctx.body.code, 0)
    assert.equal(ctx.body.error, error)
    assert.equal(ctx.body.data, undefined)
    assert.equal(api.counts.length, 0)
  })
}

test('malformed model output reports a response-format error instead of fabricated recognition', async () => {
  const api = gateway({ post: async () => ({ data: { output: 'not valid JSON' } }) }), ctx = context(imageA)
  await api.recognize(ctx)
  assert.equal(ctx.status, 502)
  assert.equal(ctx.body.error, 'COZE_INVALID_RESPONSE')
  assert.equal(ctx.body.data, undefined)
  assert.equal(api.counts.length, 0)
})

test('valid nested string output and absent TTS remain compatible', async () => {
  const api = gateway({ post: async () => ({ data: { output: JSON.stringify(result('茶盏')) } }) })
  const ctx = context(imageA)
  await api.recognize(ctx)
  assert.equal(ctx.body.code, 1)
  assert.equal(ctx.body.data.name, '茶盏')
  assert.equal(ctx.body.data.audio_url, '')
})

test('database count failure preserves real recognition and reports the count warning', async () => {
  const api = gateway({ post: async () => ({ data: result('花瓶') }), execute: async () => { throw new Error('database unavailable') } })
  const ctx = context(imageB)
  await api.recognize(ctx)
  assert.equal(ctx.body.code, 1)
  assert.equal(ctx.body.data.name, '花瓶')
  assert.match(ctx.body.notice, /未计入/)
})
