const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveVoice, createCacheKey, validateRequest, VALID_VOICES } = require('../src/services/ttsService')

test('only the three approved Chinese voices are accepted', () => {
  assert.deepEqual([...VALID_VOICES].sort(), [
    'zh-CN-XiaoxiaoNeural',
    'zh-CN-YunjianNeural',
    'zh-CN-YunxiNeural'
  ].sort())
  assert.equal(resolveVoice('李清照'), 'zh-CN-XiaoxiaoNeural')
  assert.equal(resolveVoice('苏轼'), 'zh-CN-YunxiNeural')
  assert.equal(resolveVoice('', 'zh-CN-YunjianNeural'), 'zh-CN-YunjianNeural')
})

test('request validation rejects empty and overlong text', () => {
  assert.throws(() => validateRequest({ text: '' }), /不能为空/)
  assert.throws(() => validateRequest({ text: 'a'.repeat(501) }), /500/)
  assert.throws(() => validateRequest({ text: '朗读', voice: 'en-US-AriaNeural' }), /音色/)
  assert.doesNotThrow(() => validateRequest({ text: '朗读', voice: 'zh-CN-YunxiNeural' }))
})

test('cache key is deterministic for text, voice and rate', () => {
  const one = createCacheKey({ text: '水光潋滟晴方好', voice: 'zh-CN-YunxiNeural', rate: '-10%' })
  const two = createCacheKey({ text: '水光潋滟晴方好', voice: 'zh-CN-YunxiNeural', rate: '-10%' })
  const other = createCacheKey({ text: '水光潋滟晴方好', voice: 'zh-CN-YunjianNeural', rate: '-10%' })
  assert.equal(one, two)
  assert.notEqual(one, other)
})
