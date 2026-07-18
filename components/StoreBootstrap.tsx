'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/stores/appStore'
import { useTopicGroups } from '@/lib/TopicsContext'

// Replaces the old ProgressProvider. Zustand stores need no context wrapper —
// this component just fires the one-time init effects that used to live
// inside ProgressProvider's body, mirroring the existing ThemeSync/OfflineToast
// pattern of a tiny always-mounted, render-null client component. Must be
// rendered inside <TopicsProvider> so useTopicGroups() resolves.
export default function StoreBootstrap({ initialTotals }: { initialTotals: Record<string, number> }) {
  const groups = useTopicGroups()

  useEffect(() => {
    useAppStore.getState().setInitialTotals(initialTotals)
  }, [])

  // groups is a fresh server-provided value on every request/router.refresh()
  // (see TopicsContext) — mirror it into the store so stats/offline caching,
  // which read it via get() outside of React, stay in sync with dynamically
  // added topics/subtopics.
  useEffect(() => {
    useAppStore.getState().setGroups(groups)
  }, [groups])

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
