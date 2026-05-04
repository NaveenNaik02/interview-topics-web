'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type FontSize = 'sm' | 'md' | 'lg'

const PROSE_CLASS: Record<FontSize, string> = {
  sm: 'prose-sm',
  md: 'prose-base',
  lg: 'prose-lg',
}

interface FontSizeContextType {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
  proseClass: string
}

const FontSizeContext = createContext<FontSizeContextType | null>(null)

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>('md')

  useEffect(() => {
    const stored = localStorage.getItem('font-size') as FontSize | null
    if (stored && stored in PROSE_CLASS) setFontSizeState(stored)
  }, [])

  const setFontSize = useCallback((size: FontSize) => {
    setFontSizeState(size)
    localStorage.setItem('font-size', size)
  }, [])

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize, proseClass: PROSE_CLASS[fontSize] }}>
      {children}
    </FontSizeContext.Provider>
  )
}

export function useFontSize() {
  const ctx = useContext(FontSizeContext)
  if (!ctx) throw new Error('useFontSize must be used within FontSizeProvider')
  return ctx
}
