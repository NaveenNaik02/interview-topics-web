'use client'

import React, { createContext, useContext, useMemo, useState } from 'react'

interface DrawerContextType {
  drawerOpen: boolean
  setDrawerOpen: (open: boolean) => void
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined)

export function DrawerProvider({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const value = useMemo(() => ({ drawerOpen, setDrawerOpen }), [drawerOpen])

  return (
    <DrawerContext.Provider value={value}>{children}</DrawerContext.Provider>
  )
}

export function useDrawer() {
  const context = useContext(DrawerContext)
  if (context === undefined) {
    throw new Error('useDrawer must be used within a DrawerProvider')
  }
  return context
}
