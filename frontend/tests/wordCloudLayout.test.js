import { test } from 'node:test'
import assert from 'node:assert/strict'
import { layoutWordCloud } from '../src/utils/wordCloudLayout.js'

const measure = (text, size) => [...text].length * size
test('cloud placement is deterministic, bounded, non-overlapping, and derived only from query terms', () => {
  const terms = Array.from({ length: 150 }, (_, i) => ({ term: String.fromCodePoint(0x4e00 + i) + '风', count: 150 - i, poems: 150 - i }))
  const cloud = layoutWordCloud(terms, measure)
  assert.deepEqual(cloud, layoutWordCloud(terms, measure))
  assert.ok(cloud.words.length >= 110)
  assert.equal(cloud.words[0].term, terms[0].term)
  assert.ok(cloud.words[0].size > cloud.words.at(-1).size)
  for (const word of cloud.words) {
    assert.ok(terms.some(t => t.term === word.term && t.count === word.count))
    assert.ok(word.box.x >= 0 && word.box.y >= 0)
    assert.ok(word.box.x + word.box.w <= cloud.width && word.box.y + word.box.h <= cloud.height)
    for (const other of cloud.words) {
      if (word === other) continue
      assert.equal(word.box.x < other.box.x + other.box.w && word.box.x + word.box.w > other.box.x && word.box.y < other.box.y + other.box.h && word.box.y + word.box.h > other.box.y, false)
    }
  }
})
test('empty, tiny and changed search results never borrow words from another cloud', () => {
  assert.deepEqual(layoutWordCloud([], measure).words, [])
  const one = layoutWordCloud([{ term: '明月', count: 1, poems: 1 }], measure)
  assert.deepEqual(one.words.map(w => w.term), ['明月'])
  assert.deepEqual(layoutWordCloud([{ term: '春风', count: 20, poems: 8 }], measure).words.map(w => w.term), ['春风'])
})
test('malformed terms are dropped before scaling, so one bad row cannot blank or crash the cloud', () => {
  const valid = [
    { term: '明月', count: 20, poems: 8 },
    { term: '春风', count: 12, poems: 5 },
    { term: '江河', count: 6, poems: 3 },
  ]
  const clean = layoutWordCloud(valid, measure)
  const dirty = [
    valid[0],
    { term: '孤舟', poems: 1 },          // missing count
    { term: '远山', count: NaN, poems: 1 },
    { term: '落日', count: -5, poems: 1 },
    { term: '归雁', count: '7', poems: 1 }, // non-numeric, was still counted in the aggregate
    { term: null, count: 3, poems: 1 },  // non-iterable term
    null,                                // null row
    valid[1],
    valid[2],
  ]
  const cloud = layoutWordCloud(dirty, measure)
  assert.deepEqual(cloud.words.map(w => w.term), valid.map(t => t.term))
  assert.deepEqual(cloud, clean)
  assert.ok(cloud.words.every(w => Number.isFinite(w.size) && Number.isFinite(w.x) && Number.isFinite(w.y)))
})
test('a skipped row must not change the scale of the surviving words', () => {
  const terms = Array.from({ length: 60 }, (_, i) => ({ term: String.fromCodePoint(0x4e00 + i) + '风', count: 60 - i, poems: 60 - i }))
  const skipped = Array.from({ length: 40 }, (_, i) => ({ term: '孤舟' + i, count: '7', poems: 1 }))
  assert.deepEqual(layoutWordCloud([...terms, ...skipped], measure), layoutWordCloud(terms, measure))
})
test('non-array results degrade to an empty cloud instead of throwing', () => {
  for (const value of [undefined, null, {}, 'oops', 7]) {
    assert.deepEqual(layoutWordCloud(value, measure), { width: 1000, height: 660, words: [] })
  }
})
