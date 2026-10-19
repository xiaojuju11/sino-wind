import test from 'node:test'
import assert from 'node:assert/strict'
import { GUOFENG_VOICES, speakGuofeng, voiceForSage } from '../src/utils/guofengSpeech.js'

test('maps sages to the approved guofeng voices', () => {
  assert.equal(voiceForSage('李清照'), GUOFENG_VOICES.female)
  assert.equal(voiceForSage('苏轼'), GUOFENG_VOICES.scholar)
  assert.equal(voiceForSage('unknown'), GUOFENG_VOICES.scholar)
})

test('falls back when the server TTS request fails', async () => {
  let fallbackText = ''
  await speakGuofeng({
    text: '清风徐来',
    request: async () => ({ ok: false, status: 503 }),
    fallback: async text => { fallbackText = text }
  })
  assert.equal(fallbackText, '清风徐来')
})

test('plays the server audio URL on a user-triggered call', async () => {
  let played = ''
  const audio = {
    play: async () => { played = 'played' },
    pause() {},
    addEventListener(type, callback) { if (type === 'ended') queueMicrotask(callback) }
  }
  await speakGuofeng({
    text: '水光潋滟晴方好',
    request: async () => ({ ok: true, json: async () => ({ data: { audioUrl: '/tts-cache/a.mp3' } }) }),
    audioFactory: url => { assert.equal(url, '/tts-cache/a.mp3'); return audio }
  })
  assert.equal(played, 'played')
})
