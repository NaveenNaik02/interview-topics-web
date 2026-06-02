'use client'

import React, { createContext, useContext, useState } from 'react'

interface UIContextType {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
  query: string
  setQuery: (q: string) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <UIContext.Provider value={{
      drawerOpen,
      setDrawerOpen,
      query,
      setQuery,
    }}>
      {children}
    </UIContext.Provider>
  )
}

export function useUI() {
  const context = useContext(UIContext)
  if (context === undefined) {
    throw new Error('useUI must be used within a UIProvider')
  }
  return context
}
