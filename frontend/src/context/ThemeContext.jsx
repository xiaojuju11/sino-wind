import React, { useEffect, useState, useCallback, useMemo } from 'react'
import './theme.less'
import {
  ThemeContext,
  useTheme,
  THEME_LIGHT,
  THEME_DARK,
  THEME_STORAGE_KEY
} from './useTheme.js'

// eslint-disable-next-line react-refresh/only-export-components
export { useTheme }

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem(THEME_STORAGE_KEY) || 'light'
    } catch {
      return 'light'
    }
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // ignore
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

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export default ThemeProvider
