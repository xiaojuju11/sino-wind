// ⌨️ 软键盘视口探测（纯逻辑，不依赖 React / 不直接摸 DOM 全局，便于 node:test 验证）
//
// 为什么需要它：Android WebView（微信 / QQ / Chrome）在软键盘弹起时会把 layout viewport
// 一起压缩，`position: fixed; bottom: 0` 的底栏于是被顶到键盘上方，浮在正文中间；
// iOS Safari 则相反——layout viewport 不变，固定底栏被键盘直接盖住。
// 两端现象不同，但都该在「正在打字」时把底栏收起来，落键盘后再复原。
//
// 判定不靠 UA：同时观察
//   1. Android / 微信：基线高度 - 当前 innerHeight（布局视口被压缩）
//   2. iOS：innerHeight - visualViewport.height（键盘盖在可视视口上）
// 两者任一超过阈值且焦点在文本输入控件内，即视为键盘弹起。

// 会唤起软键盘的 input 类型；button / checkbox / radio / file 等不弹键盘
const TEXT_INPUT_TYPES = new Set([
  '', 'text', 'search', 'email', 'number', 'password', 'tel', 'url', 'date', 'datetime-local', 'month', 'time', 'week',
])

// 键盘高度普遍 ≥ 250px；120px 足以过滤地址栏收起、旋转等小抖动
export const KEYBOARD_INSET_THRESHOLD = 120

/**
 * 是否为会唤起软键盘的文本输入控件。
 * 只读、禁用、纯展示类元素一律不算，避免「点开只读文本域」误判。
 */
export function isEditableElement(element) {
  if (!element || typeof element.matches !== 'function') return false
  if (element.disabled || element.readOnly) return false
  if (element.isContentEditable === true) return true
  const tag = typeof element.tagName === 'string' ? element.tagName.toUpperCase() : ''
  if (tag === 'TEXTAREA') return true
  if (tag === 'INPUT') return TEXT_INPUT_TYPES.has(String(element.type || '').toLowerCase())
  return false
}

/**
 * 依据当前视口快照判断软键盘是否弹起（纯函数，便于逐端写单测）。
 * @param {{focused:boolean, baselineHeight:number, innerHeight:number, visualViewportHeight:number, threshold?:number}} snapshot
 */
export function resolveKeyboardOpen({
  focused,
  baselineHeight,
  innerHeight,
  visualViewportHeight,
  threshold = KEYBOARD_INSET_THRESHOLD,
}) {
  if (!focused) return false
  if (!Number.isFinite(innerHeight) || !Number.isFinite(baselineHeight)) return false
  const viewportHeight = Number.isFinite(visualViewportHeight) ? visualViewportHeight : innerHeight
  const overlayInset = innerHeight - viewportHeight // iOS：键盘盖住的可视视口高度
  const layoutShrink = baselineHeight - innerHeight // Android：被压缩掉的布局视口高度
  return overlayInset >= threshold || layoutShrink >= threshold
}

/**
 * 监听软键盘开合，并在 <html> 上同步 `is-keyboard-open` 类名。
 * 只使用 addEventListener / classList，注入 win/doc 即可在 node:test 里跑完整流程。
 * @returns {() => void} 停止监听并复原类名
 */
export function createKeyboardWatcher({ win, doc, onChange, threshold = KEYBOARD_INSET_THRESHOLD }) {
  const noop = () => {}
  if (!win || !doc || typeof win.addEventListener !== 'function') return noop

  const viewport = win.visualViewport || null
  const root = doc.documentElement
  const requestFrame = typeof win.requestAnimationFrame === 'function'
    ? win.requestAnimationFrame.bind(win)
    : (callback) => win.setTimeout(callback, 16)
  const cancelFrame = typeof win.cancelAnimationFrame === 'function'
    ? win.cancelAnimationFrame.bind(win)
    : (id) => win.clearTimeout(id)

  const viewportHeight = () => (viewport && Number.isFinite(viewport.height) ? viewport.height : win.innerHeight)
  const innerHeight = () => (Number.isFinite(win.innerHeight) ? win.innerHeight : 0)

  // 基线 = 无键盘时的最高可视高度；只增不减，靠「焦点离开」与「横竖屏切换」重置
  let baseline = Math.max(innerHeight(), Number.isFinite(viewport?.height) ? viewport.height : 0)
  let lastWidth = win.innerWidth || 0
  let open = false
  let frame = 0
  let settleTimer = 0

  const apply = () => {
    frame = 0
    // 横竖屏会把 innerHeight 整体换一个量级；宽度变化即视为换屏，重置基线
    const width = win.innerWidth || 0
    if (Math.abs(width - lastWidth) > 60) {
      lastWidth = width
      baseline = Math.max(innerHeight(), viewportHeight() || 0)
    }

    const focused = isEditableElement(doc.activeElement)
    if (!focused) baseline = Math.max(baseline, innerHeight())

    const next = resolveKeyboardOpen({
      focused,
      baselineHeight: baseline,
      innerHeight: innerHeight(),
      visualViewportHeight: viewportHeight(),
      threshold,
    })
    if (next === open) return
    open = next
    if (typeof root?.classList?.toggle === 'function') {
      root.classList.toggle('is-keyboard-open', open)
    }
    if (typeof onChange === 'function') onChange(open)
  }

  const schedule = () => {
    if (frame) return
    frame = requestFrame(apply)
  }

  // 焦点在输入框之间挪动时先别急着收键盘状态；真失焦会在 90ms 后按真实视口复算
  const onFocusOut = () => {
    if (settleTimer) win.clearTimeout(settleTimer)
    settleTimer = win.setTimeout(() => {
      settleTimer = 0
      schedule()
    }, 90)
  }

  const onFocusIn = () => {
    baseline = Math.max(baseline, innerHeight(), viewportHeight() || 0)
    schedule()
  }

  win.addEventListener('resize', schedule, { passive: true })
  win.addEventListener('orientationchange', schedule, { passive: true })
  // 从 bfcache 回来时重算一次，避免上一条页面残留的 is-keyboard-open 卡住底栏
  win.addEventListener('pageshow', schedule, { passive: true })
  doc.addEventListener('focusin', onFocusIn, true)
  doc.addEventListener('focusout', onFocusOut, true)
  if (viewport && typeof viewport.addEventListener === 'function') {
    viewport.addEventListener('resize', schedule, { passive: true })
  }

  return function stop() {
    win.removeEventListener('resize', schedule)
    win.removeEventListener('orientationchange', schedule)
    win.removeEventListener('pageshow', schedule)
    doc.removeEventListener('focusin', onFocusIn, true)
    doc.removeEventListener('focusout', onFocusOut, true)
    if (viewport && typeof viewport.removeEventListener === 'function') {
      viewport.removeEventListener('resize', schedule)
    }
    if (frame) cancelFrame(frame)
    frame = 0
    if (settleTimer) win.clearTimeout(settleTimer)
    settleTimer = 0
    open = false
    if (typeof root?.classList?.remove === 'function') root.classList.remove('is-keyboard-open')
  }
}
