import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'

export const THEME_LIGHT = 'light'
export const THEME_DARK = 'dark'
export const THEME_STORAGE_KEY = 'gufeng_theme'

export const ThemeContext = createContext({
  theme: 'light',
  isDark: false,
  toggleTheme: () => {},
  setTheme: () => {}
})

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

export const useTheme = () => useContext(ThemeContext)
export default ThemeProvider
