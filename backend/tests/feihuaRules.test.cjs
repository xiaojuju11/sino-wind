const test = require('node:test')
const assert = require('node:assert/strict')
const engine = require('../src/utils/feihuaEngine')

test('strict games never accept a sage answer outside the selected rhyme', () => {
  const rhyme = '下平声七阳', game = engine.createGame({ keyword: '月', rhyme }, 0)
  const result = engine.move(game, { action: 'submit', line: '床前明月光' }, 1).game
  const sage = result.turns.find(turn => turn.role === 'sage')
  assert.ok(!sage || engine.rhymeGroups(sage.line).includes(rhyme))
  if (!sage) assert.equal(result.winner, 'user')
})

test('free-rhyme mode still permits recognized verses in different rhyme groups', () => {
  const first = engine.move(engine.createGame({ keyword: '月' }, 0), { action: 'submit', line: '举头望明月' }, 1).game
  const next = engine.move(first, { action: 'submit', line: '床前明月光' }, 2).game
  assert.equal(next.turns.filter(turn => turn.role === 'user').length, 2)
  assert.notEqual(next.winner, 'sage')
})
