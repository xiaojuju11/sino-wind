import { useTheme } from './useTheme.js'
import './themeToggle.less'

/**
 * 日月模式切换药丸（成员 A 提供，供成员 B 的首页题头 / 成员 D 的书斋清规直接引用）
 *
 * 依据 TRD §3.2 第 1 项：顶部右侧「晓色晨宣 / 月下墨境」药丸切换按钮，驱动 useTheme() 切换全局 data-theme。
 * 用法：
 *   import ThemeToggle from '../context/ThemeToggle.jsx'
 *   <ThemeToggle />                       // 题头右侧直接放
 *   <ThemeToggle className='home-hero__mode' />   // 需要外部定位时传 className
 *
 * 图标说明（⚠️ 待队长处理）：TRD §1.2 要求图标一律取自团队 Iconfont 库，但
 * `font_5104647`（基础库）与 `font_5241957`（国风库）的类名清单里均无日 / 月图标，
 * `antd-mobile-icons` 也没有（已逐项核对导出清单）。故此处以**内联线性矢量 SVG** 兜底：
 * 非位图、非 emoji、非字符箭头，颜色由 currentColor 驱动，可随激活态变朱砂。
 * 待库中补入 icon-ri / icon-yue 后，把下面两个 Glyph 换成 <i className='iconfont icon-ri' aria-hidden='true' />
 * 即可，组件其余部分与本文件样式均无需改动。
 */

const STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round'
}

function SunGlyph() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
      <circle cx='12' cy='12' r='4.3' {...STROKE} />
      <path d='M12 2.4v2.6M12 19v2.6M2.4 12h2.6M19 12h2.6M5.2 5.2l1.9 1.9M16.9 16.9l1.9 1.9M18.8 5.2l-1.9 1.9M7.1 16.9l-1.9 1.9' {...STROKE} />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg viewBox='0 0 24 24' aria-hidden='true' focusable='false'>
      <path d='M20.2 14.8A8.6 8.6 0 1 1 9.2 3.8a6.9 6.9 0 0 0 11 11Z' {...STROKE} />
    </svg>
  )
}

export default function ThemeToggle({ className = '' }) {
  const { isDark, setTheme } = useTheme()

  return (
    <div className={`theme-toggle${className ? ' ' + className : ''}`} role='group' aria-label='日月模式切换'>
      <button
        type='button'
        className={`theme-toggle__option${isDark ? '' : ' is-active'}`}
        aria-pressed={!isDark}
        aria-label='切换到晓色晨宣（浅色）'
        title='晓色晨宣'
        onClick={() => setTheme('light')}
      >
        <SunGlyph />
      </button>
      <button
        type='button'
        className={`theme-toggle__option${isDark ? ' is-active' : ''}`}
        aria-pressed={isDark}
        aria-label='切换到月下墨境（深色）'
        title='月下墨境'
        onClick={() => setTheme('dark')}
      >
        <MoonGlyph />
      </button>
    </div>
  )
}
