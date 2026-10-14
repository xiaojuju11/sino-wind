import React from 'react'
import { CompassOutline, StarOutline } from 'antd-mobile-icons'
import { useTheme } from './useTheme.js'
import './themeToggle.less'

// Official vector marks: compass for daylight, star for night.
function SunGlyph() { return <CompassOutline aria-hidden="true" /> }
function MoonGlyph() { return <StarOutline aria-hidden="true" /> }

/**
 * 日月模式切换器（彻底解决图标颠倒、重叠与错位问题）
 *
 * 规范：
 * - 白昼（晓色晨宣）：滑块在左，金乌耀日（朱砂温润）
 * - 夜月（月下墨境）：滑块在右，素娥清辉（泥金冷月）
 * - 物理轨道约束，绝对无穿帮重叠
 */
export default function ThemeToggle({ className = '' }) {
  const { isDark, toggleTheme, setTheme } = useTheme()

  return (
    <div
      className={`theme-toggle ${isDark ? 'is-dark' : 'is-light'}${className ? ' ' + className : ''}`}
      role="switch"
      tabIndex={0}
      aria-checked={isDark}
      aria-label="日月模式切换"
      title={isDark ? '当前：月下墨境 · 点击切换为晓色晨宣' : '当前：晓色晨宣 · 点击切换为月下墨境'}
      onClick={toggleTheme}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggleTheme()
        }
      }}
    >
      {/* 轨道背景双图标（提示左右两端含义） */}
      <div className="theme-toggle__track" aria-hidden="true">
        <span
          className={`theme-toggle__track-icon theme-toggle__track-icon--sun ${!isDark ? 'is-lit' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setTheme('light')
          }}
        >
          <SunGlyph />
        </span>
        <span
          className={`theme-toggle__track-icon theme-toggle__track-icon--moon ${isDark ? 'is-lit' : ''}`}
          onClick={(e) => {
            e.stopPropagation()
            setTheme('dark')
          }}
        >
          <MoonGlyph />
        </span>
      </div>

      {/* 滑块：流畅位移，承载当前模式微光图标 */}
      <div className="theme-toggle__thumb" aria-hidden="true">
        {isDark ? <MoonGlyph /> : <SunGlyph />}
      </div>
    </div>
  )
}
