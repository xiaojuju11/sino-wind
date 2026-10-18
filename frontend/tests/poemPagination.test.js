import test from 'node:test'
import assert from 'node:assert/strict'
import { paginatePoem, paginateLines } from '../src/utils/poemPagination.js'
test('short poems keep their original lines on one page', () => {
  const lines = ['床前明月光，', '疑是地上霜。', '举头望明月，', '低头思故乡。']
  assert.deepEqual(paginatePoem(lines), [lines])
})
test('long poems retain every character in order across compact pages', () => {
  const lines = Array.from({ length: 60 }, (_, i) => i + '玉洞真人降，金幢中道遥。')
  const pages = paginatePoem(lines)
  assert.ok(pages.length > 1)
  assert.equal(pages.flat().join(''), lines.join(''))
  assert.ok(pages.every(page => page.length <= 6 && page.join('').length <= 120))
})
test('one oversized paragraph is split without losing punctuation or surrogate pairs', () => {
  const lines = [('明月🌙照山河，清风入梦来。').repeat(40)]
  const pages = paginatePoem(lines)
  assert.ok(pages.length > 1)
  assert.equal(pages.flat().join(''), lines.join(''))
  assert.ok(pages.flat().every(line => Array.from(line).length <= 32))
})
test('tone pages retain original line objects and indices', () => {
  const lines = Array.from({ length: 37 }, (_, index) => ({ index, text: '平仄'.repeat(10) }))
  const pages = paginateLines(lines, { maxRows: 6, maxCharacters: 100, textOf: line => line.text })
  assert.deepEqual(pages.flat(), lines)
  assert.ok(pages.every(page => page.length <= 6))
  assert.equal(pages.at(-1).at(-1).index, 36)
})
