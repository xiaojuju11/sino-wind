import test from 'node:test'
import assert from 'node:assert/strict'
import { readYayanNotebook, finishStudySession, formatStudyDate } from '../src/utils/studyFlow.js'

function storage(values = {}) {
  const map = new Map(Object.entries(values))
  return { getItem: key => map.get(key) ?? null, removeItem: key => map.delete(key), map }
}

test('the notebook reads Home entries and preserves source attribution without inventing examples', () => {
  const local = storage({ gufeng_yayan_list: JSON.stringify([
    { id: 0, ancient: '故人西辞黄鹤楼', modern: '送朋友', offline: false, author: '李白', createdAt: '2026-10-16' },
    { ancient: '春风又绿江南岸', offline: true },
    { ancient: '未注明来源' },
  ]) })
  const result = readYayanNotebook(local)
  assert.equal(result.items.length, 3)
  assert.equal(result.items[0].key, '0:0')
  assert.equal(result.items[0].author, '李白')
  assert.equal(result.items[0].source, '在线雅译摘录')
  assert.equal(result.items[1].source, '离线范例摘录')
  assert.equal(result.items[2].source, '首页摘录（来源未标注）')
  assert.deepEqual(readYayanNotebook(storage()), { items: [], error: '' })
})

test('damaged notebook data remains untouched and warns instead of silently overwriting', () => {
  for (const raw of ['{invalid', '{}', '[null,{"ancient":2}]']) {
    const local = storage({ gufeng_yayan_list: raw })
    const result = readYayanNotebook(local)
    assert.equal(result.items.length, 0)
    assert.ok(result.error)
    assert.equal(local.getItem('gufeng_yayan_list'), raw)
  }
  const local = storage({ gufeng_yayan_list: '[null,{"ancient":"保留可读原稿"}]' })
  assert.equal(readYayanNotebook(local).items.length, 1)
  assert.ok(readYayanNotebook(local).error)
})

test('sign out removes session credentials, keeps personal assets and announces identity change', () => {
  const local = storage({ token: 'secret', userInfo: 'old-profile', theme: 'dark', gufeng_yayan_list: '[]', 'scholar-letters:v1:user:7': 'pending-original', 'scholar-artifacts:v1:guest': 'guest-original' })
  const events = new EventTarget()
  let changed = 0
  events.addEventListener('scholarSessionChanged', () => changed++)
  finishStudySession(local, events)
  assert.equal(local.getItem('token'), null)
  assert.equal(local.getItem('userInfo'), null)
  assert.equal(local.getItem('theme'), 'dark')
  assert.equal(local.getItem('gufeng_yayan_list'), '[]')
  assert.equal(local.getItem('scholar-letters:v1:user:7'), 'pending-original')
  assert.equal(local.getItem('scholar-artifacts:v1:guest'), 'guest-original')
  assert.equal(changed, 1)
})

test('failure to remove token cannot announce a successful sign out', () => {
  let events = 0
  assert.throws(() => finishStudySession({ removeItem() { throw new Error('denied') } }, { dispatchEvent() { events++ } }), /denied/)
  assert.equal(events, 0)
})

test('archive dates are honest for missing and invalid values and use Shanghai dates', () => {
  assert.equal(formatStudyDate(''), '日期未记录')
  assert.equal(formatStudyDate('not-a-date'), '日期未记录')
  assert.equal(formatStudyDate('2026-10-15T17:00:00Z'), '2026/10/16')
})
