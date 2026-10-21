import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'

async function loadSwipeModule() {
  const source = await fs.readFile(new URL('../src/utils/swipeBack.js', import.meta.url), 'utf8')
  const module = new vm.SourceTextModule(source, { context: vm.createContext({}) })
  await module.link(() => { throw new Error('unexpected import') })
  await module.evaluate()
  return module.namespace
}

const gesture = (overrides = {}) => ({
  startX: 8,
  startY: 400,
  x: 120,
  y: 404,
  duration: 240,
  viewportWidth: 390,
  ...overrides,
})

test('an inward swipe from either screen edge requests back', async () => {
  const { resolveSwipeGesture } = await loadSwipeModule()
  const fromLeft = resolveSwipeGesture(gesture())
  assert.equal(fromLeft.triggered, true)
  assert.equal(fromLeft.direction, 'right')

  const fromRight = resolveSwipeGesture(gesture({ startX: 382, x: 260 }))
  assert.equal(fromRight.triggered, true)
  assert.equal(fromRight.direction, 'left')
})

test('a swipe that starts away from the edge stays with the page (horizontal scrollers keep working)', async () => {
  const { resolveSwipeGesture } = await loadSwipeModule()
  assert.equal(resolveSwipeGesture(gesture({ startX: 160, x: 320 })).triggered, false)
})

test('outward, vertical, short, slow, blocked and malformed gestures never navigate back', async () => {
  const { resolveSwipeGesture } = await loadSwipeModule()
  // 从左边缘往左划（向外）
  assert.equal(resolveSwipeGesture(gesture({ x: -40 })).triggered, false)
  // 斜着竖划
  assert.equal(resolveSwipeGesture(gesture({ y: 620 })).triggered, false)
  // 位移不足
  assert.equal(resolveSwipeGesture(gesture({ x: 50 })).triggered, false)
  // 慢慢拖
  assert.equal(resolveSwipeGesture(gesture({ duration: 1500 })).triggered, false)
  // 输入框 / 弹层里起手
  assert.equal(resolveSwipeGesture(gesture({ blocked: true })).triggered, false)
  // 坐标缺失
  assert.equal(resolveSwipeGesture(gesture({ viewportWidth: Number.NaN })).triggered, false)
})

test('each secondary page knows its parent, and top-level tabs have none', async () => {
  const { parentRouteOf } = await loadSwipeModule()
  assert.equal(parentRouteOf('/chat/3'), '/letters')
  assert.equal(parentRouteOf('/scholar-chat/libai'), '/letters')
  assert.equal(parentRouteOf('/ai-chat'), '/letters')
  assert.equal(parentRouteOf('/mine/setting'), '/mine')
  assert.equal(parentRouteOf('/mine'), null)
  assert.equal(parentRouteOf('/mine/artifacts'), '/mine')
  assert.equal(parentRouteOf('/poem-collection'), '/mine')
  assert.equal(parentRouteOf('/accountSetting'), '/mine')
  assert.equal(parentRouteOf('/poem'), '/home')
  assert.equal(parentRouteOf('/poem?from=home'), '/home')
  assert.equal(parentRouteOf('/city-chronicle'), '/home')
  assert.equal(parentRouteOf('/scene-poetry/view/7'), '/home')
  assert.equal(parentRouteOf('/legal/terms'), '/login')
  assert.equal(parentRouteOf('/recover'), null)
  assert.equal(parentRouteOf('/home'), null)
  assert.equal(parentRouteOf('/letters'), null)
  assert.equal(parentRouteOf('/login'), null)
  assert.equal(parentRouteOf('poem'), null)
  assert.equal(parentRouteOf(undefined), null)
})

test('history index only counts real in-app entries', async () => {
  const { historyIndex } = await loadSwipeModule()
  assert.equal(historyIndex({ idx: 2 }), 2)
  assert.equal(historyIndex({ idx: 0 }), 0)
  assert.equal(historyIndex({ idx: -1 }), 0)
  assert.equal(historyIndex({ idx: '3' }), 0)
  assert.equal(historyIndex(null), 0)
  assert.equal(historyIndex(undefined), 0)
})
