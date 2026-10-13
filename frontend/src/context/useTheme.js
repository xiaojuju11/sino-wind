import { createContext, useContext } from 'react'

/**
 * 日月主题的上下文载体与读取钩子（与 ThemeContext.jsx 同目录拆分）
 * 拆成独立文件的理由：react-refresh 只允许「一个文件只导出组件」，
 * 而 useTheme 是钩子、ThemeContext 是常量，故与 ThemeProvider 分文件。
 */

export const THEME_STORAGE_KEY = 'gufeng_theme' // TRD §5 本地存储数据字典：'light' 或 'dark'

export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'

export const ThemeContext = createContext({
  theme: THEME_LIGHT,
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
})

/** 读取全局日月主题：{ theme, isDark, toggleTheme, setTheme } */
export function useTheme() {
  return useContext(ThemeContext)
}
