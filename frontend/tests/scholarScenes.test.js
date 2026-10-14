import test from 'node:test'
import assert from 'node:assert/strict'
import { statSync } from 'node:fs'
import { getScholarScene } from '../src/utils/scholarScenes.js'

test('all preset chat scenes resolve to distinct shipped mobile-sized assets', () => {
  const ids = ['libai', 'sushi', 'liqingzhao', 'dufu', 'wangyangming', 'xinqiji', 'group_zhulin']
  const sources = new Set()
  for (const id of ids) {
    const scene = getScholarScene(id, '', '/')
    sources.add(scene.src)
    const size = statSync(new URL(`../public${scene.src}`, import.meta.url)).size
    assert.ok(size > 10000 && size < 300000, `${id}: mobile asset budget`)
    assert.ok(scene.name && scene.title)
  }
  assert.equal(sources.size, ids.length)
})

test('custom sages never borrow Li Bai by default and subpath deployment is respected', () => {
  assert.equal(getScholarScene('custom', '陶渊明', '/app/'), null)
  assert.equal(getScholarScene('__proto__', '', '/'), null)
  assert.equal(getScholarScene('custom', '苏轼', '/app/').src, '/app/assets/scholar-scenes/sushi-scene-v1.webp')
})
