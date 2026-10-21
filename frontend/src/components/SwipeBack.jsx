import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { historyIndex, parentRouteOf, resolveSwipeGesture, SWIPE_CLAIM_DISTANCE } from '../utils/swipeBack'

// 这些区域里的横滑有自己的含义（打字、抽屉、题头水墨划动、翻页），不接管
const BLOCKED_SELECTOR = [
  'input',
  'textarea',
  'select',
  '[contenteditable="true"]',
  '[data-swipe-back="off"]',
  '.adm-mask',
  '.adm-popup',
  '.home-hero',
].join(',')

const isBlockedTarget = (target) => {
  if (!target || typeof target.closest !== 'function') return true
  // 输入框、抽屉/弹层遮罩、题头水墨区里起手都不接管
  return Boolean(target.closest(BLOCKED_SELECTOR))
}

/**
 * 全局边缘滑动返回：从屏幕左/右边缘向内轻扫 = 回上一级页面。
 * 挂载在 BrowserRouter 内（需要 navigate）；桌面端不受影响（只监听 touch）。
 */
export default function SwipeBack() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const pathnameRef = useRef(pathname)
  useEffect(() => { pathnameRef.current = pathname }, [pathname])

  useEffect(() => {
    let gesture = null

    const requestBack = () => {
      const path = pathnameRef.current
      if (path === '/login' || path === '/recover') return
      // React Router 在 history.state 里维护 idx：>0 表示站内还有上一层
      if (historyIndex(window.history?.state) > 0) {
        navigate(-1)
        return
      }
      // 直接打开二级页（分享链接、收藏）时站内没有历史，退到它的上级而不是退出站点
      const parent = parentRouteOf(path)
      if (parent && parent !== path) navigate(parent, { replace: true })
    }

    const onTouchStart = (event) => {
      gesture = null
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      gesture = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now(),
        blocked: isBlockedTarget(event.target),
      }
    }

    const onTouchMove = (event) => {
      if (!gesture || gesture.blocked) return
      const touch = event.touches[0]
      if (!touch) return
      const dx = touch.clientX - gesture.x
      const dy = touch.clientY - gesture.y
      // 竖着动就交还给页面滚动，本次不再当返回手势
      if (Math.abs(dy) > Math.abs(dx) * 1.2) {
        gesture.blocked = true
        return
      }
      if (Math.abs(dx) <= SWIPE_CLAIM_DISTANCE) return
      // 明确是横滑就先压住浏览器/微信自身的侧滑前进后退
      if (event.cancelable) event.preventDefault()
    }

    const onTouchEnd = (event) => {
      const current = gesture
      gesture = null
      if (!current || current.blocked) return
      const touch = event.changedTouches?.[0]
      if (!touch) return
      const result = resolveSwipeGesture({
        startX: current.x,
        startY: current.y,
        x: touch.clientX,
        y: touch.clientY,
        duration: Date.now() - current.time,
        viewportWidth: window.innerWidth,
        blocked: current.blocked,
      })
      if (result.triggered) requestBack()
    }

    const onTouchCancel = () => { gesture = null }

    // 捕获阶段监听：页面里的横向滚动组件常在冒泡阶段 stopPropagation，
    // 只有捕获阶段才能稳定拿到边缘手势
    document.addEventListener('touchstart', onTouchStart, { passive: true, capture: true })
    document.addEventListener('touchmove', onTouchMove, { passive: false, capture: true })
    document.addEventListener('touchend', onTouchEnd, { passive: true, capture: true })
    document.addEventListener('touchcancel', onTouchCancel, { passive: true, capture: true })
    return () => {
      document.removeEventListener('touchstart', onTouchStart, { capture: true })
      document.removeEventListener('touchmove', onTouchMove, { capture: true })
      document.removeEventListener('touchend', onTouchEnd, { capture: true })
      document.removeEventListener('touchcancel', onTouchCancel, { capture: true })
    }
  }, [navigate])

  return null
}
