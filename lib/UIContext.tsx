'use client'

import React, { createContext, useContext, useState } from 'react'

interface UIContextType {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

const UIContext = createContext<UIContextType | undefined>(undefined)

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <UIContext.Provider value={{ 
      drawerOpen, 
      setDrawerOpen
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
