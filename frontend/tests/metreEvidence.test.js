import test from 'node:test'
import assert from 'node:assert/strict'
import { analyzeTurnMetre } from '../src/utils/turnMetre.js'

test('unknown characters and missing rhymes remain unverified rather than labelled as passed', () => {
  const result = analyzeTurnMetre('龘靐')
  assert.equal(result.verified, false)
  assert.equal(result.rhymeTone, '待核')
  assert.match(result.verdict, /待核/)
  assert.ok(result.unknownCharacters.length > 0)
})

test('a known verse exposes the checked dimensions without claiming whole-poem adjudication', () => {
  const result = analyzeTurnMetre('床前明月光')
  assert.equal(result.lastChar, '光')
  assert.equal(result.toneNotation.length, 5)
  assert.ok(result.rhymeName)
  assert.doesNotMatch(result.verdict, /判定通过|全诗/)
  assert.equal(analyzeTurnMetre(''), null)
})
