'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/stores/appStore'

// Replaces the old ProgressProvider. Zustand stores need no context wrapper —
// this component just fires the one-time init effects that used to live
// inside ProgressProvider's body, mirroring the existing ThemeSync/OfflineToast
// pattern of a tiny always-mounted, render-null client component.
export default function StoreBootstrap({ initialTotals }: { initialTotals: Record<string, number> }) {
  useEffect(() => {
    useAppStore.getState().setInitialTotals(initialTotals)
  }, [])

  useEffect(() => {
    useAppStore.getState().initSettingsFromLocalStorage()
  }, [])

  useEffect(() => {
    return useAppStore.getState().initOfflineState()
  }, [])

  useEffect(() => {
    return useAppStore.getState().initAuth()
  }, [])

  return null
}
