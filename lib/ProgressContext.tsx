'use client'

// Thin compatibility layer over the Zustand store (lib/stores/appStore.ts) —
// every consumer still does `import { useProgress } from '@/lib/ProgressContext'`
// and destructures the exact same fields it always has, but the actual state
// now lives in Zustand (see components/StoreBootstrap.tsx, which replaces the
// old <ProgressProvider> wrapper in app/layout.tsx). `useShallow` keeps this
// hook's returned object referentially stable across renders where nothing
// selected here actually changed, matching the old Context's re-render
// characteristics rather than making them worse.
import { useCallback, useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from './stores/appStore'
import { useTopicGroups } from './TopicsContext'
import { useInitialTotals } from './TotalsContext'
import { computeStats, computeSectionStats, computePriorityStats } from './stores/progressSelectors'

export function useProgress() {
  const state = useAppStore(useShallow(s => ({
    store: s.store,
    totals: s.totals,
    mounted: s.mounted,
    setSectionTotal: s.setSectionTotal,
    toggle: s.toggle,
    setMany: s.setMany,
    resetAll: s.resetAll,
    // Priority
    priorityStore: s.priorityStore,
    setPriority: s.setPriority,
    // Inbox
    inboxItems: s.inboxItems,
    appendInboxItem: s.appendInboxItem,
    appendInboxItems: s.appendInboxItems,
    removeInboxItem: s.removeInboxItem,
    // Auth
    user: s.user,
    signInWithGitHub: s.signInWithGitHub,
    signOut: s.signOut,
    // Settings
    settingsLoaded: s.settingsLoaded,
    defaultSort: s.defaultSort,
    rememberFilters: s.rememberFilters,
    settingsTheme: s.settingsTheme,
    setDefaultSort: s.setDefaultSort,
    setRememberFilters: s.setRememberFilters,
    setThemeSetting: s.setThemeSetting,
    navigateAfterMove: s.navigateAfterMove,
    setNavigateAfterMove: s.setNavigateAfterMove,
    defaultPriority: s.defaultPriority,
    setDefaultPriority: s.setDefaultPriority,
    // Instruction presets
    instructionPresets: s.instructionPresets,
    activeInstructionPresetId: s.activeInstructionPresetId,
    setActiveInstructionPresetId: s.setActiveInstructionPresetId,
    addInstructionPreset: s.addInstructionPreset,
    updateInstructionPreset: s.updateInstructionPreset,
    deleteInstructionPreset: s.deleteInstructionPreset,
    resetSettingsToDefaults: s.resetSettingsToDefaults,
    // Offline mode
    isOnline: s.isOnline,
    offlineModeEnabled: s.offlineModeEnabled,
    isCaching: s.isCaching,
    cachingProgress: s.cachingProgress,
    pendingOpsCount: s.pendingOpsCount,
    isSyncing: s.isSyncing,
    cachedAt: s.cachedAt,
    enableOfflineMode: s.enableOfflineMode,
    disableOfflineMode: s.disableOfflineMode,
    syncNow: s.syncNow,
  })))

  const { store, priorityStore, mounted } = state

  // Computed here (not read from the store's own `stats`/groups/totals
  // fields) so it stays correct synchronously during render — groups and
  // initialTotals come from server-provided context values available
  // immediately, whereas mirroring them into the Zustand store happens in a
  // StoreBootstrap effect that only runs after mount. Relying on the store
  // alone would flash "0 questions" on first paint until that effect fires.
  // state.totals only ever holds per-section refinements from
  // setSectionTotal (seeded from '' and merged on top of initialTotals here)
  // plus, once StoreBootstrap's effect runs, a full copy of initialTotals
  // itself — so this merge is stable (harmlessly redundant) after mount.
  const groups = useTopicGroups()
  const initialTotals = useInitialTotals()
  const totals = useMemo(() => ({ ...initialTotals, ...state.totals }), [initialTotals, state.totals])
  const stats = useMemo(() => computeStats(store, totals, groups), [store, totals, groups])

  const isComplete = useCallback((id: string) => mounted && !!store[id], [store, mounted])

  const sectionStats = useCallback((topic: string, file: string, total: number) => {
    if (!mounted) return { done: 0, total }
    return computeSectionStats(store, topic, file, total)
  }, [store, mounted])

  const allStats = useCallback((sections: { topic: string; file: string; total: number }[]) => {
    let totalQ = 0
    let doneQ = 0
    for (const s of sections) {
      const st = sectionStats(s.topic, s.file, s.total)
      totalQ += s.total
      doneQ += st.done
    }
    return { done: doneQ, total: totalQ }
  }, [sectionStats])

  const getPriority = useCallback((id: string) => (mounted ? priorityStore[id] ?? null : null), [priorityStore, mounted])

  const priorityStats = useCallback((topic: string, file: string, total: number) => {
    if (!mounted) return { high: 0, med: 0, low: 0, none: 0 }
    return computePriorityStats(priorityStore, topic, file, total)
  }, [priorityStore, mounted])

  // Omit the store's raw (unmerged) `totals` from the public return value —
  // `stats` above is the merged, render-safe aggregate every consumer wants;
  // nothing has ever read `totals` directly off this hook.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { totals: _rawTotals, ...rest } = state
  return { ...rest, stats, isComplete, sectionStats, allStats, getPriority, priorityStats }
}
