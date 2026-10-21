import test from 'node:test'
import assert from 'node:assert/strict'
import vm from 'node:vm'
import fs from 'node:fs/promises'

async function loadKeyboardModule() {
  const source = await fs.readFile(new URL('../src/utils/keyboardViewport.js', import.meta.url), 'utf8')
  const module = new vm.SourceTextModule(source, { context: vm.createContext({}) })
  await module.link(() => { throw new Error('unexpected import') })
  await module.evaluate()
  return module.namespace
}

function createElement({ tagName, type = '', isContentEditable = false, disabled = false, readOnly = false }) {
  return { tagName, type, isContentEditable, disabled, readOnly, matches: () => true }
}

// 用可注入的 win/doc 模拟两端的视口变化，覆盖真实浏览器的监听链路
function createHarness({ innerHeight = 800, innerWidth = 390 } = {}) {
  const viewport = { innerHeight, innerWidth, visualViewportHeight: innerHeight }
  const listeners = () => {
    const map = new Map()
    return {
      addEventListener(type, handler) {
        if (!map.has(type)) map.set(type, new Set())
        map.get(type).add(handler)
      },
      removeEventListener(type, handler) { map.get(type)?.delete(handler) },
      emit(type, event = {}) { for (const handler of [...(map.get(type) || [])]) handler(event) },
      count(type) { return (map.get(type) || new Set()).size },
    }
  }

  const winEvents = listeners()
  const docEvents = listeners()
  const viewportEvents = listeners()
  const classes = new Set()
  const frames = []
  const timers = []

  const win = {
    get innerHeight() { return viewport.innerHeight },
    get innerWidth() { return viewport.innerWidth },
    visualViewport: {
      get height() { return viewport.visualViewportHeight },
      addEventListener: viewportEvents.addEventListener,
      removeEventListener: viewportEvents.removeEventListener,
      emit: viewportEvents.emit,
    },
    addEventListener: winEvents.addEventListener,
    removeEventListener: winEvents.removeEventListener,
    emit: winEvents.emit,
    requestAnimationFrame(callback) { frames.push(callback); return frames.length },
    cancelAnimationFrame(id) { frames[id - 1] = null },
    setTimeout(callback, ms) { timers.push({ callback, ms }); return timers.length },
    clearTimeout(id) { if (timers[id - 1]) timers[id - 1] = null },
  }

  const doc = {
    activeElement: null,
    documentElement: {
      classList: {
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name) },
        remove(name) { classes.delete(name) },
        contains(name) { return classes.has(name) },
      },
    },
    addEventListener: docEvents.addEventListener,
    removeEventListener: docEvents.removeEventListener,
    events: docEvents,
  }

  const flushFrames = () => { while (frames.length) frames.shift()?.() }
  const flushTimers = () => { while (timers.length) timers.shift()?.callback() }

  return { win, doc, viewport, classes, flushFrames, flushTimers, viewportEvents, winEvents, docEvents }
}

test('isEditableElement only treats real text inputs as keyboard sources', async () => {
  const { isEditableElement } = await loadKeyboardModule()
  assert.equal(isEditableElement(createElement({ tagName: 'TEXTAREA' })), true)
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'text' })), true)
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'search' })), true)
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'number' })), true)
  assert.equal(isEditableElement(createElement({ tagName: 'DIV', isContentEditable: true })), true)
  // 不会唤起软键盘的控件与只读/禁用控件
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'checkbox' })), false)
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'submit' })), false)
  assert.equal(isEditableElement(createElement({ tagName: 'BUTTON' })), false)
  assert.equal(isEditableElement(createElement({ tagName: 'INPUT', type: 'text', readOnly: true })), false)
  assert.equal(isEditableElement(createElement({ tagName: 'TEXTAREA', disabled: true })), false)
  assert.equal(isEditableElement(createElement({ tagName: 'SELECT' })), false)
  assert.equal(isEditableElement(null), false)
})

test('resolveKeyboardOpen separates the Android shrink from the iOS overlay', async () => {
  const { resolveKeyboardOpen } = await loadKeyboardModule()
  // Android / 微信：布局视口被压缩
  assert.equal(resolveKeyboardOpen({ focused: true, baselineHeight: 800, innerHeight: 500, visualViewportHeight: 500 }), true)
  // iOS：布局视口不变，键盘盖住可视视口
  assert.equal(resolveKeyboardOpen({ focused: true, baselineHeight: 800, innerHeight: 800, visualViewportHeight: 430 }), true)
  // 地址栏收起之类的小幅抖动不算键盘
  assert.equal(resolveKeyboardOpen({ focused: true, baselineHeight: 800, innerHeight: 800, visualViewportHeight: 735 }), false)
  // 没有焦点输入框时，再大的收缩也不算
  assert.equal(resolveKeyboardOpen({ focused: false, baselineHeight: 800, innerHeight: 400, visualViewportHeight: 400 }), false)
  // 数据缺失时保守判定为未弹起
  assert.equal(resolveKeyboardOpen({ focused: true, baselineHeight: Number.NaN, innerHeight: 400, visualViewportHeight: 400 }), false)
})

test('Android-style keyboard shrinks the layout viewport and hides the tab bar', async () => {
  const { createKeyboardWatcher } = await loadKeyboardModule()
  const harness = createHarness({ innerHeight: 800 })
  const changes = []
  const stop = createKeyboardWatcher({ win: harness.win, doc: harness.doc, onChange: (open) => changes.push(open) })

  harness.doc.activeElement = createElement({ tagName: 'TEXTAREA' })
  harness.docEvents.emit('focusin', { target: harness.doc.activeElement })
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)

  harness.viewport.innerHeight = 500
  harness.viewport.visualViewportHeight = 500
  harness.winEvents.emit('resize')
  harness.viewportEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), true)
  assert.deepEqual(changes, [true])

  harness.doc.activeElement = null
  harness.docEvents.emit('focusout', {})
  harness.flushTimers()
  harness.viewport.innerHeight = 800
  harness.viewport.visualViewportHeight = 800
  harness.winEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)
  assert.deepEqual(changes, [true, false])

  stop()
})

test('iOS-style keyboard overlays the visual viewport and hides the tab bar', async () => {
  const { createKeyboardWatcher } = await loadKeyboardModule()
  const harness = createHarness({ innerHeight: 800 })
  const stop = createKeyboardWatcher({ win: harness.win, doc: harness.doc })

  harness.doc.activeElement = createElement({ tagName: 'INPUT', type: 'text' })
  harness.docEvents.emit('focusin', { target: harness.doc.activeElement })
  harness.viewport.visualViewportHeight = 430
  harness.viewportEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), true)

  harness.doc.activeElement = null
  harness.viewport.visualViewportHeight = 800
  harness.docEvents.emit('focusout', {})
  harness.flushTimers()
  harness.viewportEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)

  stop()
})

test('a shrunken viewport without a text field never hides the tab bar', async () => {
  const { createKeyboardWatcher } = await loadKeyboardModule()
  const harness = createHarness({ innerHeight: 800 })
  const stop = createKeyboardWatcher({ win: harness.win, doc: harness.doc })

  harness.doc.activeElement = createElement({ tagName: 'BUTTON' })
  harness.docEvents.emit('focusin', { target: harness.doc.activeElement })
  harness.viewport.innerHeight = 420
  harness.viewport.visualViewportHeight = 420
  harness.winEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)

  stop()
})

test('stop() detaches every listener and restores the page class', async () => {
  const { createKeyboardWatcher } = await loadKeyboardModule()
  const harness = createHarness({ innerHeight: 800 })
  const stop = createKeyboardWatcher({ win: harness.win, doc: harness.doc })

  harness.doc.activeElement = createElement({ tagName: 'TEXTAREA' })
  harness.viewport.innerHeight = 480
  harness.viewport.visualViewportHeight = 480
  harness.winEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), true)

  stop()
  assert.equal(harness.classes.has('is-keyboard-open'), false)
  assert.equal(harness.winEvents.count('resize'), 0)
  assert.equal(harness.docEvents.count('focusin'), 0)
  assert.equal(harness.viewportEvents.count('resize'), 0)

  harness.viewport.innerHeight = 300
  harness.winEvents.emit('resize')
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)
})

test('rotating the device resets the height baseline instead of faking a keyboard', async () => {
  const { createKeyboardWatcher } = await loadKeyboardModule()
  const harness = createHarness({ innerHeight: 800, innerWidth: 390 })
  const stop = createKeyboardWatcher({ win: harness.win, doc: harness.doc })

  // 横屏：高度骤减、宽度骤增
  harness.viewport.innerWidth = 844
  harness.viewport.innerHeight = 390
  harness.viewport.visualViewportHeight = 390
  harness.winEvents.emit('resize')
  harness.flushFrames()

  harness.doc.activeElement = createElement({ tagName: 'TEXTAREA' })
  harness.docEvents.emit('focusin', { target: harness.doc.activeElement })
  harness.flushFrames()
  assert.equal(harness.classes.has('is-keyboard-open'), false)

  stop()
})
