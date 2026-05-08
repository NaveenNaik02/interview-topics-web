'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'sepia'

const CYCLE: Theme[] = ['light', 'sepia', 'dark']

interface ThemeContextType {
  theme: Theme
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextType | null>(null)

function applyTheme(t: Theme) {
  const cl = document.documentElement.classList
  cl.remove('dark', 'theme-sepia')
  if (t === 'dark') cl.add('dark')
  if (t === 'sepia') cl.add('theme-sepia')
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const stored = localStorage.getItem('theme') as Theme | null
    const initial: Theme = stored ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    setTheme(initial)
    applyTheme(initial)
  }, [])

  const toggle = useCallback(() => {
    setTheme(prev => {
      const next = CYCLE[(CYCLE.indexOf(prev) + 1) % CYCLE.length]
      localStorage.setItem('theme', next)
      applyTheme(next)
      return next
    })
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
