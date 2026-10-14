import React from 'react'
import { useTheme } from './useTheme.js'
import './themeToggle.less'

/**
 * 宋风矢量金乌日轮（纯矢量描边，杜绝位图与字库乱码）
 */
function SunGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4.3" fill="currentColor" fillOpacity="0.18" />
      <path d="M12 2.2v2.4M12 19.4v2.4M2.2 12h2.4M19.4 12h2.4" />
      <path d="M5.05 5.05l1.7 1.7M17.25 17.25l1.7 1.7M5.05 18.95l1.7-1.7M17.25 6.75l1.7-1.7" />
    </svg>
  )
}

/**
 * 宋风矢量素娥清月（月牙 + 双点星辰）
 */
function MoonGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.5 13.05A8.8 8.8 0 1 1 11.2 3.7 6.8 6.8 0 0 0 20.5 13.05z" fill="currentColor" fillOpacity="0.22" />
      <circle cx="18" cy="6.2" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="20.2" cy="9.2" r="0.65" fill="currentColor" stroke="none" />
    </svg>
  )
}

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
