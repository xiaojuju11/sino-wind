// 👈👉 边缘滑动返回：把「左右滑 = 退出项目」改成「左右滑 = 回上一级」。
//
// 为什么需要自己写：
// - Android Chrome / WebView / 微信把边缘横滑解释成浏览器的历史前进/后退，
//   页面在历史第一层时就直接退出站点；
// - 这类手势不受路由控制，必须用 touch 事件在页面内接管（配合全局
//   `overscroll-behavior-x: none` 压住浏览器自身的侧滑导航）。
//
// 判定原则（只认「从屏幕边缘向内」的横滑）：
//   起点在左/右边缘 26px 内 → 只能向内划 → 水平位移 ≥ 64px、明显横向、700ms 内完成。
// 这样就不会抢走正文里的横向滚动（信札头像条、诗词长卷、词云）与竖向滚动。

export const SWIPE_EDGE = 26 // 起始点距屏幕边缘的最大像素
export const SWIPE_MIN_DISTANCE = 64 // 触发返回的最小向内位移
export const SWIPE_MAX_DURATION = 700 // 超过这个时长视为慢慢拖，不算手势
export const SWIPE_AXIS_RATIO = 1.25 // |dx| 至少是 |dy| 的 1.25 倍，避免斜着滚动误触
export const SWIPE_CLAIM_DISTANCE = 10 // 位移超过 10px 且以横向为主时，立即压住浏览器手势

/**
 * 依据一次触摸手势的起止点判断是否触发「返回」。
 * @returns {{triggered: boolean, direction: 'left'|'right'|null, distance: number}}
 */
export function resolveSwipeGesture({
  startX,
  startY,
  x,
  y,
  duration,
  viewportWidth,
  blocked = false,
  edge = SWIPE_EDGE,
  minDistance = SWIPE_MIN_DISTANCE,
  maxDuration = SWIPE_MAX_DURATION,
  ratio = SWIPE_AXIS_RATIO,
}) {
  const idle = { triggered: false, direction: null, distance: 0 }
  if (blocked) return idle
  if (![startX, startY, x, y, viewportWidth].every(Number.isFinite)) return idle
  const fromLeft = startX <= edge
  const fromRight = startX >= viewportWidth - edge
  if (!fromLeft && !fromRight) return idle
  const dx = x - startX
  const dy = y - startY
  const inward = fromLeft ? dx : -dx
  if (inward < minDistance) return idle
  if (Math.abs(dx) < Math.abs(dy) * ratio) return idle
  if (!Number.isFinite(duration) || duration < 0 || duration > maxDuration) return idle
  return { triggered: true, direction: fromLeft ? 'right' : 'left', distance: inward }
}

/**
 * 历史栈里上一层是谁（浏览器后退会用到的目标）。
 * 首层（idx 0）时给二级页一个「上级」，避免无历史可退就直接退出站点。
 */
export function parentRouteOf(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return null
  const path = pathname.split('?')[0].split('#')[0]
  if (path === '/login' || path === '/recover') return null
  if (path === '/home' || path === '/letters' || path === '/mine') return null
  if (path.startsWith('/chat/') || path.startsWith('/scholar-chat/') || path === '/ai-chat') return '/letters'
  if (path === '/poem-collection' || path === '/accountSetting') return '/mine'
  if (path.startsWith('/mine/')) return '/mine'
  if (path.startsWith('/legal/')) return '/login'
  return '/home'
}

/** React Router 把当前历史序号写在 history.state.idx：>0 说明站内还有上一层。 */
export function historyIndex(state) {
  const idx = state?.idx
  return Number.isSafeInteger(idx) && idx > 0 ? idx : 0
}
