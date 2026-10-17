import test from 'node:test'
import assert from 'node:assert/strict'
import { shareSceneFile } from '../src/utils/sceneShare.js'

test('supported file sharing uses the selected image and never downloads twice', async () => {
  const file = { name: 'scene.png' }, sent = [], downloads = []
  const result = await shareSceneFile(file, { navigator: { canShare: () => true, share: async data => sent.push(data) }, download: value => downloads.push(value) })
  assert.equal(result, 'shared'); assert.equal(sent[0].files[0], file); assert.equal(downloads.length, 0)
})

test('unsupported and blocked sharing fall back to a usable image download', async () => {
  for (const navigator of [{}, { canShare: () => false, share() {} }, { canShare: () => true, share: async () => { throw new Error('blocked') } }]) {
    const downloads = [], file = { name: 'scene.png' }
    assert.equal(await shareSceneFile(file, { navigator, download: value => downloads.push(value) }), 'downloaded')
    assert.deepEqual(downloads, [file])
  }
})

test('cancelling a system share leaves the user in place without a download', async () => {
  const navigator = { canShare: () => true, share: async () => { throw { name: 'AbortError' } } }
  assert.equal(await shareSceneFile({}, { navigator, download: () => assert.fail('cancel must not download') }), 'cancelled')
})
