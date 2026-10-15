import test from 'node:test'
import assert from 'node:assert/strict'
import { readYayanNotebook, finishShuzhaiSession, unreadReplyCount } from '../src/utils/shuzhaiFlow.js'

function memory(entries = {}) {
  const data = new Map(Object.entries(entries))
  return { data, getItem: key => data.get(key) ?? null, removeItem: key => data.delete(key) }
}

test('the Home notebook is read as real local extracts, with zero and offline source preserved', () => {
  const storage = memory({ gufeng_yayan_list: JSON.stringify([
    { id: 0, ancient: '清风入怀', modern: '心情舒畅', author: '典范', explanation: '闲适之意', offline: true, createdAt: '2026/10/15' },
    { id: 1, ancient: '闲看云起', modern: '从容一些', offline: false }
  ]) })
  const { records, error } = readYayanNotebook(storage)
  assert.equal(error, ''); assert.equal(records.length, 2)
  assert.equal(records[0].key, '0:0'); assert.equal(records[0].offline, true)
  assert.equal(records[1].modern, '从容一些')
  assert.equal(storage.data.size, 1)
})

test('empty and damaged notebook data never become sample collections or erase originals', () => {
  assert.equal(readYayanNotebook(memory()).records.length, 0)
  for (const raw of ['broken', '{}', '[null, {"ancient": ""}]']) {
    const storage = memory({ gufeng_yayan_list: raw })
    const result = readYayanNotebook(storage)
    assert.equal(result.records.length, 0); assert.ok(result.error)
    assert.equal(storage.getItem('gufeng_yayan_list'), raw)
  }
})

test('logout removes the credential and legacy profile but preserves pending assets and theme', () => {
  const storage = memory({ token: 'test-session', userInfo: '{"nickname":"旧用户"}', 'scholar-letters:v1:user:1': 'pending-originals', 'scholar-artifacts:v1:guest': 'guest-artifacts', gufeng_yayan_list: 'notebook', theme: 'dark' })
  const events = new EventTarget(); let changes = 0
  events.addEventListener('scholarSessionChanged', () => changes++)
  finishShuzhaiSession(storage, events)
  assert.equal(storage.getItem('token'), null); assert.equal(storage.getItem('userInfo'), null)
  assert.equal(storage.getItem('scholar-letters:v1:user:1'), 'pending-originals')
  assert.equal(storage.getItem('scholar-artifacts:v1:guest'), 'guest-artifacts')
  assert.equal(storage.getItem('gufeng_yayan_list'), 'notebook'); assert.equal(storage.getItem('theme'), 'dark')
  assert.equal(changes, 1)
})

test('failed credential removal cannot be reported as a completed logout', () => {
  const events = new EventTarget(); let changes = 0
  events.addEventListener('scholarSessionChanged', () => changes++)
  assert.throws(() => finishShuzhaiSession({ removeItem: () => { throw new Error('storage blocked') } }, events), /blocked/)
  assert.equal(changes, 0)
})

test('message badge counts actual unread replies only, including a genuine zero', () => {
  assert.equal(unreadReplyCount([]), 0)
  assert.equal(unreadReplyCount([{ sageId: 'libai', reply: null }, { reply: { unread: false } }, { reply: { unread: true } }, { reply: { unread: true } }]), 2)
})
