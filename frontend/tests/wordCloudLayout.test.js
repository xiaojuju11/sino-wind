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
