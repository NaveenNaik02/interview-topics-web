import type { StateCreator } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import { TOPIC_GROUPS } from '@/lib/topics'
import { PAGES_CACHE_NAME, ASSETS_CACHE_NAME } from '@/lib/swConstants'
import {
  getOfflineEnabled, setOfflineEnabled,
  setCachedProgress,
  getCachedAt, setCachedAt,
  getCachedTotals, setCachedTotals,
  setCachedQuestions,
  getPendingOps, clearPendingOps,
  setCachedPriority,
  getPendingPriorityOps, clearPendingPriorityOps,
  flushPendingPriorityOps,
  setCachedUserId,
  flushPendingOps,
  clearAllCachedData,
} from '@/lib/offlineSync'
import type { AppState, OfflineSlice } from '../types'

export const createOfflineSlice: StateCreator<AppState, [], [], OfflineSlice> = (set, get) => ({
  isOnline: true,
  offlineModeEnabled: false,
  isCaching: false,
  cachingProgress: null,
  pendingOpsCount: 0,
  isSyncing: false,
  cachedAt: null,

  enableOfflineMode: async () => {
    const { user, store, priorityStore, totals } = get()
    if (!user) return
    set({ isCaching: true })
    setOfflineEnabled(true)
    set({ offlineModeEnabled: true })
    setCachedUserId(user.id)

    // Snapshot current progress, priority, and question totals to localStorage
    const completedIds = Object.keys(store).filter(k => store[k])
    setCachedProgress(completedIds)
    setCachedPriority(priorityStore)
    setCachedTotals(totals)

    const allSections = TOPIC_GROUPS.flatMap(g => g.sections)
    const urls = ['/', ...allSections.map(s => `/${s.topic}/${s.file}`)]

    // Fetch and cache question content for each section using browser Supabase client
    for (const section of allSections) {
      try {
        const { data } = await supabase
          .from('questions')
          .select('id, number, title, body_html')
          .eq('topic', section.topic)
          .eq('file', section.file)
          .order('number')
        if (data && data.length > 0) {
          setCachedQuestions(section.topic, section.file,
            data.map(r => ({ id: r.id, number: r.number, title: r.title, bodyHtml: r.body_html }))
          )
        }
      } catch {
        // skip individual section failures
      }
    }

    if ('caches' in window) {
      try {
        const cache = await caches.open(PAGES_CACHE_NAME)
        let done = 0
        for (const url of urls) {
          try {
            const response = await fetch(url, { cache: 'no-store' })
            if (response.ok) await cache.put(url, response)
          } catch {
            // skip individual failures — partial cache still useful
          }
          done++
          set({ cachingProgress: { done, total: urls.length } })
        }
      } catch (err) {
        console.error('[enableOfflineMode] caches API unavailable:', err)
      }
    }

    const now = new Date().toISOString()
    setCachedAt(now)
    set({ cachedAt: now, cachingProgress: null, isCaching: false })
  },

  disableOfflineMode: async () => {
    const { isOnline, user } = get()
    // Flush pending ops if online before disabling
    if (isOnline && user && (getPendingOps().length > 0 || getPendingPriorityOps().length > 0)) {
      set({ isSyncing: true })
      await Promise.all([flushPendingOps(), flushPendingPriorityOps()])
      set({ pendingOpsCount: 0, isSyncing: false })
    }
    clearPendingOps()
    clearPendingPriorityOps()
    setOfflineEnabled(false)
    clearAllCachedData()
    set({ offlineModeEnabled: false, pendingOpsCount: 0, cachedAt: null })

    if ('caches' in window) {
      try {
        await caches.delete(PAGES_CACHE_NAME)
        await caches.delete(ASSETS_CACHE_NAME)
      } catch {}
    }
  },

  syncNow: async () => {
    const { user, isSyncing } = get()
    if (!user || isSyncing) return
    set({ isSyncing: true })
    const [okProgress, okPriority] = await Promise.all([
      flushPendingOps(),
      flushPendingPriorityOps(),
    ])
    if (okProgress && okPriority) {
      set({ pendingOpsCount: 0, cachedAt: new Date().toISOString() })
    } else {
      set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length })
    }
    set({ isSyncing: false })
  },

  initOfflineState: () => {
    // Initialize offline state from localStorage on client mount
    set({ isOnline: navigator.onLine })
    const offlineEnabled = getOfflineEnabled()
    set({ offlineModeEnabled: offlineEnabled })
    if (offlineEnabled) {
      set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length, cachedAt: getCachedAt() })
      // Restore question totals if the server couldn't fetch them (e.g. Supabase unreachable offline)
      const cachedTotals = getCachedTotals()
      if (Object.keys(cachedTotals).length > 0) {
        const prev = get().totals
        // Merge: prefer live values (non-zero) over cached fallback
        const merged = { ...cachedTotals }
        Object.entries(prev).forEach(([k, v]) => { if (v > 0) merged[k] = v })
        set({ totals: merged })
      }
    }

    const handleOnline = () => set({ isOnline: true })
    const handleOffline = () => set({ isOnline: false })
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  },
})
