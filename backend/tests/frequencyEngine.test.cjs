const { test } = require('node:test')
const assert = require('node:assert/strict')
const { analyze, contexts } = require('../src/utils/frequencyEngine.cjs')
const rows = [
  { id: 'a', corpus: 'tang', author: '甲', title: '春山', paragraphs: ['春风春风，月明。', '月明山。'], tokens: ['春风', '春风', '月明', '月明', '山'] },
  { id: 'b', corpus: 'song', author: '乙', title: '春词', paragraphs: ['春风月明。之之。'], tokens: ['春风', '月明', '之', '之'] },
]
test('字频 distinguishes repeated occurrences, document frequency and punctuation', () => {
  const result = analyze(rows, { mode: 'char', limit: 30 })
  assert.equal(result.total, 15)
  const spring = result.terms.find(t => t.term === '春')
  assert.equal(spring.count, 3); assert.equal(spring.poems, 2); assert.equal(spring.per10k, 2000)
  assert.equal(result.terms.some(t => t.term === '，'), false)
})
test('词频 counts exact segmentation tokens and excludes single characters', () => {
  const result = analyze(rows, { mode: 'word' })
  assert.equal(result.total, 6); assert.equal(result.distinct, 2)
  assert.equal(result.terms.find(t => t.term === '春风').count, 3)
  assert.equal(result.terms.find(t => t.term === '春风').poems, 2)
})
test('filters combine author, corpus, title; empty selection remains empty', () => {
  assert.equal(analyze(rows, { corpus: 'tang', author: '甲', title: '山' }).poems, 1)
  assert.equal(analyze(rows, { corpus: 'song', author: '甲' }).total, 0)
})
test('stop words do not change normalized denominator', () => {
  const a = analyze(rows, { mode: 'char' }), b = analyze(rows, { mode: 'char', stop: true })
  assert.equal(a.total, b.total); assert.equal(b.included, a.included - 2)
  assert.equal(b.terms.some(t => t.term === '之'), false)
})
test('context membership agrees with segmentation, pagination counts poems once', () => {
  const a = contexts(rows, { mode: 'word', term: '春风', page: 1 })
  assert.equal(a.total, 2); assert.deepEqual(a.items.map(p => p.id), ['a', 'b'])
  assert.equal(contexts(rows, { mode: 'word', term: '风月', page: 1 }).total, 0)
  assert.equal(contexts(rows, { mode: 'char', term: '春', page: 2 }).items.length, 0)
})
test('cloud has up to 150 real filtered terms while ranking remains at 30', () => {
  const words = Array.from({ length: 170 }, (_, i) => String.fromCodePoint(0x4e00 + i) + '风')
  const data = [{ id: 'a', corpus: 'tang', author: '甲', title: '风', paragraphs: ['春风'], tokens: words }]
  const result = analyze(data, { mode: 'word' })
  assert.equal(result.terms.length, 30); assert.equal(result.cloudTerms.length, 150)
  assert.ok(result.cloudTerms.every(t => words.includes(t.term) && t.count === 1))
  assert.deepEqual(analyze(data, { author: '乙', mode: 'word' }).cloudTerms, [])
})
