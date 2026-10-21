import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
if (require.extensions) {
  require.extensions['.css'] = () => {}
  require.extensions['.less'] = () => {}
}

const { sha256Pure, calculateFileHash } = await import('../src/utils/chunkUpload.js')

test('sha256Pure matches node crypto SHA-256 for various inputs', () => {
  const samples = [
    '',
    'a',
    'hello world',
    '华风雅集 · 云山竹简',
    'x'.repeat(5000)
  ]
  for (const str of samples) {
    const buf = Buffer.from(str)
    const expected = crypto.createHash('sha256').update(buf).digest('hex')
    const actual = sha256Pure(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
    assert.equal(actual, expected)
  }
})

test('calculateFileHash works gracefully when crypto.subtle is undefined (HTTP mode)', async () => {
  // Simulate HTTP environment where crypto.subtle is undefined
  const originalSubtle = globalThis.crypto?.subtle
  try {
    if (globalThis.crypto) {
      delete globalThis.crypto.subtle
    }
    const fakeFile = new Blob(['sample-avatar-binary-content-12345'], { type: 'image/jpeg' })
    fakeFile.name = 'avatar.jpg'

    const hash = await calculateFileHash(fakeFile)
    assert.match(hash, /^[a-f0-9]{24}_\d+$/)
    assert.ok(hash.endsWith(`_${fakeFile.size}`))
  } finally {
    if (globalThis.crypto && originalSubtle) {
      Object.defineProperty(globalThis.crypto, 'subtle', { value: originalSubtle, configurable: true })
    }
  }
})
