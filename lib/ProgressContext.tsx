'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase/client'
import type { User } from '@supabase/supabase-js'
import { TOPIC_GROUPS } from './topics'
import {
  getOfflineEnabled, setOfflineEnabled,
  getCachedProgress, setCachedProgress,
  getCachedAt, setCachedAt,
  getCachedTotals, setCachedTotals,
  setCachedQuestions,
  getPendingOps, appendPendingOp, clearPendingOps,
  getCachedPriority, setCachedPriority,
  getPendingPriorityOps, appendPendingPriorityOp, clearPendingPriorityOps,
  flushPendingPriorityOps,
  type PriorityLevel,
  setCachedUserId,
  flushPendingOps,
  clearAllCachedData,
} from './offlineSync'
import { PAGES_CACHE_NAME, ASSETS_CACHE_NAME } from './swConstants'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from './ThemeContext'
import * as progressDb from './db/progress'
import * as priorityDb from './db/priority'
import * as settingsDb from './db/settings'
import * as progressActions from './actions/progress'
import * as priorityActions from './actions/priority'
import * as settingsActions from './actions/settings'

type ProgressStore = Record<string, boolean>
type PriorityStore = Record<string, PriorityLevel>

interface ProgressStats {
  completed: number
  total: number
  bySection: Record<string, { completed: number; total: number }>
}

interface ProgressContextType {
  isComplete: (id: string) => boolean
  toggle: (id: string) => void
  setMany: (ids: string[], value: boolean) => void
  resetAll: () => void
  sectionStats: (topic: string, file: string, total: number) => { done: number; total: number }
  allStats: (sections: { topic: string; file: string; total: number }[]) => { done: number; total: number }
  stats: ProgressStats
  setSectionTotal: (url: string, total: number) => void
  mounted: boolean
  // Priority
  getPriority: (id: string) => PriorityLevel | null
  setPriority: (id: string, level: PriorityLevel | null) => void
  priorityStats: (topic: string, file: string, total: number) => { high: number; med: number; low: number; none: number }
  user: User | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  // Settings
  settingsLoaded: boolean
  defaultSort: SortMode
  rememberFilters: boolean
  settingsTheme: Theme
  setDefaultSort: (v: SortMode) => void
  setRememberFilters: (v: boolean) => void
  setThemeSetting: (v: Theme) => void
  // Offline mode
  isOnline: boolean
  offlineModeEnabled: boolean
  isCaching: boolean
  cachingProgress: { done: number; total: number } | null
  pendingOpsCount: number
  isSyncing: boolean
  cachedAt: string | null
  enableOfflineMode: () => Promise<void>
  disableOfflineMode: () => Promise<void>
  syncNow: () => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | null>(null)

export function ProgressProvider({
  children,
  initialTotals = {}
}: {
  children: React.ReactNode
  initialTotals?: Record<string, number>
}) {
  const [store, setStore] = useState<ProgressStore>({})
  const [priorityStore, setPriorityStore] = useState<PriorityStore>({})
  const [totals, setTotals] = useState<Record<string, number>>(initialTotals)
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  // Settings
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [defaultSort, setDefaultSortState] = useState<SortMode>('manual')
  const [rememberFilters, setRememberFiltersState] = useState(true)
  const [settingsTheme, setSettingsTheme] = useState<Theme>('light')

  // Offline state
  const [isOnline, setIsOnline] = useState(true)
  const [offlineModeEnabled, setOfflineModeEnabled] = useState(false)
  const [isCaching, setIsCaching] = useState(false)
  const [cachingProgress, setCachingProgress] = useState<{ done: number; total: number } | null>(null)
  const [pendingOpsCount, setPendingOpsCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [cachedAt, setCachedAtState] = useState<string | null>(null)

  const stats = useMemo(() => {
    const bySection: Record<string, { completed: number; total: number }> = {}
    let totalCompleted = 0
    let totalQuestions = 0

    TOPIC_GROUPS.forEach(group => {
      group.sections.forEach(section => {
        const url = `/${section.topic}/${section.file}`
        const prefix = `${section.topic}/${section.file}/`
        const completed = Object.keys(store).filter(k => k.startsWith(prefix) && store[k]).length
        const total = totals[url] || 0

        bySection[url] = { completed, total }
        totalCompleted += completed
        totalQuestions += total
      })
    })

    return {
      completed: totalCompleted,
      total: totalQuestions,
      bySection
    }
  }, [store, totals])

  const setSectionTotal = useCallback((url: string, total: number) => {
    setTotals(prev => {
      if (prev[url] === total) return prev
      return { ...prev, [url]: total }
    })
  }, [])

  // Hydrate settings from localStorage immediately on mount so the correct
  // sort/filter defaults are available on first paint, instead of waiting on
  // the Supabase round-trip in loadSettings (which caused sections to briefly
  // — or on a slow connection, not-so-briefly — render in manual order even
  // when a different default was saved).
  useEffect(() => {
    try {
      const s = localStorage.getItem('defaultSort')
      if (s === 'manual' || s === 'high' || s === 'low') setDefaultSortState(s)
      const r = localStorage.getItem('rememberFilters')
      if (r !== null) setRememberFiltersState(r !== '0')
      const t = localStorage.getItem('theme')
      if (t === 'dark' || t === 'sepia' || t === 'light') setSettingsTheme(t)
      setSettingsLoaded(true)
    } catch {}
  }, [])

  // Initialize offline state from localStorage on client mount
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const offlineEnabled = getOfflineEnabled()
    setOfflineModeEnabled(offlineEnabled)
    if (offlineEnabled) {
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
      setCachedAtState(getCachedAt())
      // Restore question totals if the server couldn't fetch them (e.g. Supabase unreachable offline)
      const cachedTotals = getCachedTotals()
      if (Object.keys(cachedTotals).length > 0) {
        setTotals(prev => {
          // Merge: prefer live values (non-zero) over cached fallback
          const merged = { ...cachedTotals }
          Object.entries(prev).forEach(([k, v]) => { if (v > 0) merged[k] = v })
          return merged
        })
      }
    }
  }, [])

  // Online/offline event listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      // Don't auto-sync — just update state so UI shows "Sync available" prompt
    }
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const loadProgress = useCallback(async (uid: string) => {
    const offlineEnabled = getOfflineEnabled()

    if (offlineEnabled) {
      const cached = getCachedProgress()
      // Hydrate immediately from cache if we have data or are offline
      if (cached.length > 0 || !navigator.onLine) {
        const initialStore: ProgressStore = {}
        cached.forEach(id => { initialStore[id] = true })
        setStore(initialStore)
        setMounted(true)

        // Background refresh from Supabase when online
        if (navigator.onLine) {
          progressDb.fetchProgress(uid).then(ids => {
            const freshStore: ProgressStore = {}
            ids.forEach(id => { freshStore[id] = true })
            setStore(freshStore)
            setCachedProgress(ids)
          })
        }
        return
      }
    }

    const ids = await progressDb.fetchProgress(uid)
    const initialStore: ProgressStore = {}
    ids.forEach(id => { initialStore[id] = true })
    setStore(initialStore)
    if (offlineEnabled) setCachedProgress(ids)
    setMounted(true)
  }, [])

  const loadPriority = useCallback(async (uid: string) => {
    const offlineEnabled = getOfflineEnabled()

    if (offlineEnabled) {
      const cached = getCachedPriority()
      if (Object.keys(cached).length > 0 || !navigator.onLine) {
        setPriorityStore(cached)

        if (navigator.onLine) {
          priorityDb.fetchPriority(uid).then(fresh => {
            setPriorityStore(fresh)
            setCachedPriority(fresh)
          })
        }
        return
      }
    }

    const initial = await priorityDb.fetchPriority(uid)
    setPriorityStore(initial)
    if (offlineEnabled) setCachedPriority(initial)
  }, [])

  const loadSettings = useCallback(async (uid: string) => {
    const data = await settingsDb.fetchSettings(uid)

    if (data) {
      setDefaultSortState(data.default_sort)
      setRememberFiltersState(data.remember_filters)
      setSettingsTheme(data.theme)
      try {
        localStorage.setItem('defaultSort', data.default_sort)
        localStorage.setItem('rememberFilters', data.remember_filters ? '1' : '0')
      } catch {}
    } else {
      // No row yet — bootstrap from localStorage so existing prefs aren't lost
      let lsTheme: Theme = 'light'
      let lsSort: SortMode = 'manual'
      let lsRemember = true
      try {
        const t = localStorage.getItem('theme')
        if (t === 'dark' || t === 'sepia') lsTheme = t
        const s = localStorage.getItem('defaultSort')
        if (s === 'high' || s === 'low') lsSort = s
        lsRemember = localStorage.getItem('rememberFilters') !== '0'
      } catch {}
      setDefaultSortState(lsSort)
      setRememberFiltersState(lsRemember)
      setSettingsTheme(lsTheme)
      settingsActions.insertSettings({ default_sort: lsSort, remember_filters: lsRemember, theme: lsTheme })
        .catch(err => console.error('[settings] insert failed:', err))
    }
    setSettingsLoaded(true)
  }, [])

  const setDefaultSort = useCallback((v: SortMode) => {
    setDefaultSortState(v)
    try { localStorage.setItem('defaultSort', v) } catch {}
    if (user) settingsActions.upsertSetting({ default_sort: v }).catch(err => console.error('[settings] update failed:', err))
  }, [user])

  const setRememberFilters = useCallback((v: boolean) => {
    setRememberFiltersState(v)
    try { localStorage.setItem('rememberFilters', v ? '1' : '0') } catch {}
    if (user) settingsActions.upsertSetting({ remember_filters: v }).catch(err => console.error('[settings] update failed:', err))
  }, [user])

  const setThemeSetting = useCallback((v: Theme) => {
    setSettingsTheme(v)
    if (user) settingsActions.upsertSetting({ theme: v }).catch(err => console.error('[settings] update failed:', err))
  }, [user])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
        loadPriority(session.user.id)
        loadSettings(session.user.id)
      } else {
        supabase.auth.signInAnonymously().then(({ data: { session: anonSession } }) => {
          if (anonSession) {
            setUser(anonSession.user)
            loadProgress(anonSession.user.id)
            loadPriority(anonSession.user.id)
            loadSettings(anonSession.user.id)
          }
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
        loadPriority(session.user.id)
        loadSettings(session.user.id)
        if (event === 'SIGNED_IN' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else {
        setUser(null)
        setStore({})
        setPriorityStore({})
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProgress, loadPriority])

  const signInWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin }
    })
    if (error) console.error('GitHub sign-in failed:', error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  // NOTE: side effects (server action calls, localStorage writes) must stay
  // OUTSIDE the setState updater below — React can invoke updaters during
  // render, and Server Actions touch the Next.js Router internally, which
  // throws "Cannot update Router while rendering ProgressProvider" if called
  // from inside one.
  const toggle = useCallback((id: string) => {
    if (!user) return
    const isAdd = !store[id]
    const action = isAdd ? 'add' : 'remove'
    setStore(prev => ({ ...prev, [id]: isAdd }))

    if (!isOnline && offlineModeEnabled) {
      appendPendingOp({ questionId: id, action, ts: Date.now() })
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
      const cached = getCachedProgress()
      setCachedProgress(
        isAdd ? [...new Set([...cached, id])] : cached.filter(q => q !== id)
      )
    } else {
      const write = isAdd ? progressActions.upsertProgress(id) : progressActions.deleteProgress(id)
      write.catch(err => console.error('[progress] write failed:', err))
      if (offlineModeEnabled) {
        const cached = getCachedProgress()
        setCachedProgress(
          isAdd ? [...new Set([...cached, id])] : cached.filter(q => q !== id)
        )
      }
    }
  }, [user, isOnline, offlineModeEnabled, store])

  const setMany = useCallback((ids: string[], value: boolean) => {
    if (!user) return
    setStore(prev => {
      const next = { ...prev }
      for (const id of ids) next[id] = value
      return next
    })

    if (!isOnline && offlineModeEnabled) {
      const ts = Date.now()
      ids.forEach(id => appendPendingOp({ questionId: id, action: value ? 'add' : 'remove', ts }))
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
      const cached = getCachedProgress()
      if (value) {
        setCachedProgress([...new Set([...cached, ...ids])])
      } else {
        const removeSet = new Set(ids)
        setCachedProgress(cached.filter(q => !removeSet.has(q)))
      }
    } else {
      const write = value ? progressActions.bulkUpsertProgress(ids) : progressActions.bulkDeleteProgress(ids)
      write.catch(err => console.error('[progress] bulk write failed:', err))
      if (offlineModeEnabled) {
        const cached = getCachedProgress()
        if (value) {
          setCachedProgress([...new Set([...cached, ...ids])])
        } else {
          const removeSet = new Set(ids)
          setCachedProgress(cached.filter(q => !removeSet.has(q)))
        }
      }
    }
  }, [user, isOnline, offlineModeEnabled])

  const resetAll = useCallback(() => {
    if (!user) return
    if (!isOnline && offlineModeEnabled) {
      const completed = Object.keys(store).filter(k => store[k])
      const ts = Date.now()
      completed.forEach(id => appendPendingOp({ questionId: id, action: 'remove', ts }))
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
      setCachedProgress([])
    } else {
      progressActions.deleteAllProgress().catch(err => console.error('[progress] reset failed:', err))
      if (offlineModeEnabled) setCachedProgress([])
    }
    setStore({})
  }, [user, isOnline, offlineModeEnabled, store])

  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted]
  )

  const sectionStats = useCallback(
    (topic: string, file: string, total: number) => {
      if (!mounted) return { done: 0, total }
      const prefix = `${topic}/${file}/`
      const done = Object.keys(store).filter(k => k.startsWith(prefix) && store[k]).length
      return { done, total }
    },
    [store, mounted]
  )

  const allStats = useCallback(
    (sections: { topic: string; file: string; total: number }[]) => {
      let totalQ = 0
      let doneQ = 0
      for (const s of sections) {
        const st = sectionStats(s.topic, s.file, s.total)
        totalQ += s.total
        doneQ += st.done
      }
      return { done: doneQ, total: totalQ }
    },
    [sectionStats]
  )

  // ── Priority ─────────────────────────────────────────────────────────────

  const getPriority = useCallback(
    (id: string) => (mounted ? priorityStore[id] ?? null : null),
    [priorityStore, mounted]
  )

  const setPriority = useCallback((id: string, level: PriorityLevel | null) => {
    if (!user) return
    const next = { ...priorityStore }
    if (level) next[id] = level; else delete next[id]
    setPriorityStore(next)

    if (!isOnline && offlineModeEnabled) {
      appendPendingPriorityOp({ questionId: id, level, ts: Date.now() })
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
      setCachedPriority(next)
    } else {
      const write = level ? priorityActions.upsertPriority(id, level) : priorityActions.deletePriority(id)
      write.catch(err => console.error('[priority] write failed:', err))
      if (offlineModeEnabled) setCachedPriority(next)
    }
  }, [user, isOnline, offlineModeEnabled, priorityStore])

  const priorityStats = useCallback(
    (topic: string, file: string, total: number) => {
      const prefix = `${topic}/${file}/`
      const out = { high: 0, med: 0, low: 0, none: 0 }
      if (!mounted) return out
      Object.entries(priorityStore).forEach(([k, level]) => {
        if (k.startsWith(prefix)) out[level]++
      })
      out.none = Math.max(0, total - out.high - out.med - out.low)
      return out
    },
    [priorityStore, mounted]
  )

  // ── Offline mode actions ──────────────────────────────────────────────────

  const enableOfflineMode = useCallback(async () => {
    if (!user) return
    setIsCaching(true)
    setOfflineEnabled(true)
    setOfflineModeEnabled(true)
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
          setCachingProgress({ done, total: urls.length })
        }
      } catch (err) {
        console.error('[enableOfflineMode] caches API unavailable:', err)
      }
    }

    const now = new Date().toISOString()
    setCachedAt(now)
    setCachedAtState(now)
    setCachingProgress(null)
    setIsCaching(false)
  }, [user, store, priorityStore])

  const disableOfflineMode = useCallback(async () => {
    // Flush pending ops if online before disabling
    if (isOnline && user && (getPendingOps().length > 0 || getPendingPriorityOps().length > 0)) {
      setIsSyncing(true)
      await Promise.all([flushPendingOps(), flushPendingPriorityOps()])
      setPendingOpsCount(0)
      setIsSyncing(false)
    }
    clearPendingOps()
    clearPendingPriorityOps()
    setOfflineEnabled(false)
    clearAllCachedData()
    setOfflineModeEnabled(false)
    setPendingOpsCount(0)
    setCachedAtState(null)

    if ('caches' in window) {
      try {
        await caches.delete(PAGES_CACHE_NAME)
        await caches.delete(ASSETS_CACHE_NAME)
      } catch {}
    }
  }, [isOnline, user])

  const syncNow = useCallback(async () => {
    if (!user || isSyncing) return
    setIsSyncing(true)
    const [okProgress, okPriority] = await Promise.all([
      flushPendingOps(),
      flushPendingPriorityOps(),
    ])
    if (okProgress && okPriority) {
      setPendingOpsCount(0)
      const now = new Date().toISOString()
      setCachedAt(now)
      setCachedAtState(now)
    } else {
      setPendingOpsCount(getPendingOps().length + getPendingPriorityOps().length)
    }
    setIsSyncing(false)
  }, [user, isSyncing])

  return (
    <ProgressContext.Provider value={{
      isComplete, toggle, setMany, resetAll, sectionStats, allStats, stats, setSectionTotal, mounted,
      getPriority, setPriority, priorityStats,
      user, signInWithGitHub, signOut,
      isOnline, offlineModeEnabled, isCaching, cachingProgress, pendingOpsCount, isSyncing, cachedAt,
      enableOfflineMode, disableOfflineMode, syncNow,
      settingsLoaded, defaultSort, rememberFilters, settingsTheme, setDefaultSort, setRememberFilters, setThemeSetting,
    }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
