'use client'

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react'
import { type Theme, themeClass } from '../theme'

export type { Theme }

const CYCLE: Theme[] = ['light', 'sepia', 'dark']

interface ThemeContextType {
  theme: Theme
  toggle: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function applyTheme(t: Theme) {
  const cl = document.documentElement.classList
  cl.remove('dark', 'theme-sepia')
  const c = themeClass(t)
  if (c) cl.add(c)
}

export function ThemeProvider({
  children,
  initialTheme,
}: {
  children: React.ReactNode
  initialTheme?: Theme
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme ?? 'light')

  useEffect(() => {
    // Skip when SSR already resolved and applied it.
    if (initialTheme) return
    const stored = localStorage.getItem('theme') as Theme | null
    const initial: Theme =
      stored ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light')
    setTheme(initial)
    applyTheme(initial)
  }, [initialTheme])

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length]
      localStorage.setItem('theme', next)
      applyTheme(next)
      return next
    })
  }, [])

  const setThemeDirectly = useCallback((t: Theme) => {
    setTheme(t)
    localStorage.setItem('theme', t)
    applyTheme(t)
  }, [])

  return (
    <ThemeContext.Provider
      value={{ theme, toggle, setTheme: setThemeDirectly }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
