import React, { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useTheme } from '../context/useTheme'
import '../styles/bambooBreeze.less'

/**
 * 随风摇曳的水墨修竹与月夜流萤组件
 * 
 * 遵循 DESIGN_AUDIT.md §12 动效架构规范：
 * 1. 左上角近景水墨竹枝：纯矢量写意墨竹，零位图依赖，满帧 60fps。
 * 2. 晓风拂竹物理阻尼自然摇曳（白昼 6s 周期微风拂动）。
 * 3. 粒子统一由 InkParticleField 管理；此组件不再叠加 CSS 飞叶/流萤。
 * 4. 月下墨境：夜间自动转为幽篁月影（深墨黛色），摇动放缓（9s）。
 * 5. 全程 pointer-events: none，绝不阻挡任何页面交互与按钮点击。
 */
export default function BambooBreeze() {
  const { isDark } = useTheme()
  const { pathname } = useLocation()
  const rootRef = useRef(null)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => root.classList.toggle('is-paused', motion.matches || document.hidden || Boolean(document.activeElement?.matches?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])')))
    document.addEventListener('focusin', sync)
    document.addEventListener('focusout', sync)
    document.addEventListener('visibilitychange', sync)
    motion.addEventListener('change', sync)
    sync()
    return () => {
      document.removeEventListener('focusin', sync)
      document.removeEventListener('focusout', sync)
      document.removeEventListener('visibilitychange', sync)
      motion.removeEventListener('change', sync)
    }
  }, [pathname])
  // Decorative falling leaves belong to the primary home only; secondary scenes
  // retain the background wash without an animated branch over their controls.
  if (pathname !== '/home' && pathname !== '/') return null

  return (
    <div ref={rootRef} className={`bamboo-breeze-root reference-bamboo ${isDark ? 'is-dark' : 'is-light'}`} aria-hidden="true">
      {/* ── 左上角主水墨竹枝（悬挂俯视，仿板桥墨竹）── */}
      <div className="bamboo-branch-wrapper">
        <svg
          className="bamboo-branch-svg"
          viewBox="0 0 320 280"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* 墨色渐变 */}
            <linearGradient id="bambooStalkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--bamboo-stalk-start, #1f3826)" />
              <stop offset="50%" stopColor="var(--bamboo-stalk-mid, #2d5a3f)" />
              <stop offset="100%" stopColor="var(--bamboo-stalk-end, #182f20)" />
            </linearGradient>
            <linearGradient id="bambooLeafGrad1" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="var(--bamboo-leaf-light, #3c6e4e)" />
              <stop offset="100%" stopColor="var(--bamboo-leaf-dark, #1c3825)" />
            </linearGradient>
            <linearGradient id="bambooLeafGrad2" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="var(--bamboo-leaf-light2, #477e5b)" />
              <stop offset="100%" stopColor="var(--bamboo-leaf-dark2, #24462f)" />
            </linearGradient>
            <filter id="inkGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="1" dy="2" stdDeviation="2" floodColor="rgba(0,0,0,0.18)" />
            </filter>
          </defs>

          {/* ── 竹竿 1（主干：微弧斜出）── */}
          <g filter="url(#inkGlow)">
            {/* 节 1 */}
            <path d="M-10, -5 C 20, 15 50, 45 75, 78" stroke="url(#bambooStalkGrad)" strokeWidth="6.5" strokeLinecap="round" />
            <circle cx="75" cy="78" r="4.2" fill="var(--bamboo-node, #172a1c)" />
            {/* 节 2 */}
            <path d="M75, 78 C 98, 108 118, 142 135, 180" stroke="url(#bambooStalkGrad)" strokeWidth="5.2" strokeLinecap="round" />
            <circle cx="135" cy="180" r="3.6" fill="var(--bamboo-node, #172a1c)" />
            {/* 节 3（细梢） */}
            <path d="M135, 180 C 146, 205 155, 232 162, 255" stroke="url(#bambooStalkGrad)" strokeWidth="3.4" strokeLinecap="round" />

            {/* ── 侧枝 1（自第一节分出，向右上方延伸）── */}
            <path d="M75, 78 C 110, 68 150, 62 195, 60" stroke="url(#bambooStalkGrad)" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="195" cy="60" r="2.8" fill="var(--bamboo-node, #172a1c)" />
            <path d="M195, 60 C 230, 58 265, 59 295, 63" stroke="url(#bambooStalkGrad)" strokeWidth="2.2" strokeLinecap="round" />

            {/* ── 侧枝 2（自第二节分出，向右下方展出）── */}
            <path d="M135, 180 C 170, 188 205, 198 238, 212" stroke="url(#bambooStalkGrad)" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="238" cy="212" r="2.4" fill="var(--bamboo-node, #172a1c)" />
            <path d="M238, 212 C 265, 224 288, 238 308, 255" stroke="url(#bambooStalkGrad)" strokeWidth="1.8" strokeLinecap="round" />
          </g>

          {/* ── 竹叶组 A（梢头「个」字簇叶）── */}
          <g className="bamboo-leaf-cluster cluster-a">
            {/* 叶 1 */}
            <path d="M162, 255 Q 172, 275 168, 298 Q 160, 280 162, 255 Z" fill="url(#bambooLeafGrad1)" />
            {/* 叶 2 */}
            <path d="M162, 255 Q 185, 272 208, 285 Q 186, 264 162, 255 Z" fill="url(#bambooLeafGrad2)" />
            {/* 叶 3 */}
            <path d="M162, 255 Q 150, 270 142, 292 Q 148, 270 162, 255 Z" fill="url(#bambooLeafGrad1)" />
            {/* 叶 4 */}
            <path d="M152, 220 Q 180, 235 210, 244 Q 180, 226 152, 220 Z" fill="url(#bambooLeafGrad2)" />
          </g>

          {/* ── 竹叶组 B（侧枝 1「介」字簇叶，向右飘拂）── */}
          <g className="bamboo-leaf-cluster cluster-b">
            {/* 顶叶 */}
            <path d="M295, 63 Q 320, 68 345, 75 Q 318, 62 295, 63 Z" fill="url(#bambooLeafGrad1)" />
            <path d="M295, 63 Q 318, 55 338, 48 Q 315, 54 295, 63 Z" fill="url(#bambooLeafGrad2)" />
            <path d="M295, 63 Q 315, 78 332, 92 Q 310, 75 295, 63 Z" fill="url(#bambooLeafGrad1)" />
            {/* 中叶 */}
            <path d="M195, 60 Q 218, 78 242, 95 Q 216, 74 195, 60 Z" fill="url(#bambooLeafGrad2)" />
            <path d="M195, 60 Q 225, 66 252, 70 Q 222, 60 195, 60 Z" fill="url(#bambooLeafGrad1)" />
            <path d="M195, 60 Q 185, 82 178, 106 Q 184, 82 195, 60 Z" fill="url(#bambooLeafGrad2)" />
          </g>

          {/* ── 竹叶组 C（主干中部破叶与垂叶）── */}
          <g className="bamboo-leaf-cluster cluster-c">
            <path d="M75, 78 Q 62, 105 52, 134 Q 65, 106 75, 78 Z" fill="url(#bambooLeafGrad1)" />
            <path d="M75, 78 Q 90, 102 108, 126 Q 90, 98 75, 78 Z" fill="url(#bambooLeafGrad2)" />
            <path d="M75, 78 Q 102, 92 128, 104 Q 99, 86 75, 78 Z" fill="url(#bambooLeafGrad1)" />
            <path d="M238, 212 Q 268, 218 296, 222 Q 266, 210 238, 212 Z" fill="url(#bambooLeafGrad2)" />
            <path d="M238, 212 Q 262, 234 285, 254 Q 258, 228 238, 212 Z" fill="url(#bambooLeafGrad1)" />
            <path d="M308, 255 Q 330, 270 350, 282 Q 326, 262 308, 255 Z" fill="url(#bambooLeafGrad2)" />
          </g>
        </svg>
      </div>

      {/* Falling leaves and fireflies are owned by InkParticleField only.
          Avoid a second CSS particle system drifting over the reading area. */}
    </div>
  )
}
