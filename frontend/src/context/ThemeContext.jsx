import { useCallback, useEffect, useMemo, useState } from 'react'
import { ThemeContext, THEME_DARK, THEME_LIGHT, THEME_STORAGE_KEY } from './useTheme.js'
import './theme.less'

/**
 * 全局日月主题 Provider（成员 A / TRD v3.0 §2.2 第 1 项、§3.2 第 1 项）
 * 提供：theme（'light' | 'dark'）、isDark、toggleTheme()、setTheme(next)
 * 机制：切换时把 data-theme 写到 <html>，由 ./theme.less 的 [data-theme='dark'] 规则生效；
 *       主题标识按 TRD §5 本地存储字典写入 localStorage.gufeng_theme。
 * 用法：页面/组件内 const { theme, isDark, toggleTheme } = useTheme()（取自 ./useTheme.js）
 *       顶部「晓色晨宣 ☀️ / 月下墨境 🌙」药丸按钮（成员 B 的首页题头、成员 D 的书斋清规）直接调用 toggleTheme。
 */

function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return stored === THEME_DARK ? THEME_DARK : THEME_LIGHT
  } catch {
    // 隐私模式 / 禁用本地存储时回落到晓色晨宣，不影响渲染
    return THEME_LIGHT
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // 写入失败只影响下次记忆，不打断当前切换
    }
  }, [theme])

  const setTheme = useCallback((next) => {
    setThemeState(next === THEME_DARK ? THEME_DARK : THEME_LIGHT)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === THEME_DARK ? THEME_LIGHT : THEME_DARK))
  }, [])

  const value = useMemo(
    () => ({ theme, isDark: theme === THEME_DARK, toggleTheme, setTheme }),
    [theme, setTheme, toggleTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export default ThemeProvider
