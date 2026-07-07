'use client'

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'
import { TOPIC_GROUPS } from './topics'
import {
  getOfflineEnabled, setOfflineEnabled,
  getCachedProgress, setCachedProgress,
  getCachedAt, setCachedAt,
  getCachedTotals, setCachedTotals,
  setCachedQuestions,
  getPendingOps, appendPendingOp, clearPendingOps,
  setCachedUserId,
  flushPendingOps,
} from './offlineSync'
import { PAGES_CACHE_NAME, ASSETS_CACHE_NAME } from './swConstants'

type ProgressStore = Record<string, boolean>

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
  user: User | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
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
  const [totals, setTotals] = useState<Record<string, number>>(initialTotals)
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

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

  // Initialize offline state from localStorage on client mount
  useEffect(() => {
    setIsOnline(navigator.onLine)
    const offlineEnabled = getOfflineEnabled()
    setOfflineModeEnabled(offlineEnabled)
    if (offlineEnabled) {
      setPendingOpsCount(getPendingOps().length)
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
          supabase.from('progress').select('question_id').eq('user_id', uid)
            .then(({ data: rows }) => {
              if (!rows) return
              const freshStore: ProgressStore = {}
              rows.forEach(r => { freshStore[r.question_id] = true })
              setStore(freshStore)
              setCachedProgress(rows.map(r => r.question_id))
            })
        }
        return
      }
    }

    const { data: rows } = await supabase
      .from('progress')
      .select('question_id')
      .eq('user_id', uid)

    const initialStore: ProgressStore = {}
    rows?.forEach(r => { initialStore[r.question_id] = true })
    setStore(initialStore)
    if (offlineEnabled) setCachedProgress(rows?.map(r => r.question_id) ?? [])
    setMounted(true)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
      } else {
        supabase.auth.signInAnonymously().then(({ data: { session: anonSession } }) => {
          if (anonSession) {
            setUser(anonSession.user)
            loadProgress(anonSession.user.id)
          }
        })
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
        if (event === 'SIGNED_IN' && window.location.hash) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search)
        }
      } else {
        setUser(null)
        setStore({})
      }
    })

    return () => subscription.unsubscribe()
  }, [loadProgress])

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

  const toggle = useCallback((id: string) => {
    if (!user) return
    setStore(prev => {
      const next = { ...prev, [id]: !prev[id] }
      const isAdd = next[id]
      const action = isAdd ? 'add' : 'remove'

      if (!isOnline && offlineModeEnabled) {
        appendPendingOp({ questionId: id, action, ts: Date.now() })
        setPendingOpsCount(getPendingOps().length)
        const cached = getCachedProgress()
        setCachedProgress(
          isAdd ? [...new Set([...cached, id])] : cached.filter(q => q !== id)
        )
      } else {
        if (isAdd) {
          supabase.from('progress').upsert({ user_id: user.id, question_id: id }).then()
        } else {
          supabase.from('progress').delete().eq('user_id', user.id).eq('question_id', id).then()
        }
        if (offlineModeEnabled) {
          const cached = getCachedProgress()
          setCachedProgress(
            isAdd ? [...new Set([...cached, id])] : cached.filter(q => q !== id)
          )
        }
      }
      return next
    })
  }, [user, isOnline, offlineModeEnabled])

  const setMany = useCallback((ids: string[], value: boolean) => {
    if (!user) return
    setStore(prev => {
      const next = { ...prev }
      for (const id of ids) next[id] = value

      if (!isOnline && offlineModeEnabled) {
        const ts = Date.now()
        ids.forEach(id => appendPendingOp({ questionId: id, action: value ? 'add' : 'remove', ts }))
        setPendingOpsCount(getPendingOps().length)
        const cached = getCachedProgress()
        if (value) {
          setCachedProgress([...new Set([...cached, ...ids])])
        } else {
          const removeSet = new Set(ids)
          setCachedProgress(cached.filter(q => !removeSet.has(q)))
        }
      } else {
        if (value) {
          supabase.from('progress').upsert(ids.map(id => ({ user_id: user.id, question_id: id }))).then()
        } else {
          supabase.from('progress').delete().eq('user_id', user.id).in('question_id', ids).then()
        }
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
      return next
    })
  }, [user, isOnline, offlineModeEnabled])

  const resetAll = useCallback(() => {
    if (!user) return
    if (!isOnline && offlineModeEnabled) {
      const completed = Object.keys(store).filter(k => store[k])
      const ts = Date.now()
      completed.forEach(id => appendPendingOp({ questionId: id, action: 'remove', ts }))
      setPendingOpsCount(getPendingOps().length)
      setCachedProgress([])
    } else {
      supabase.from('progress').delete().eq('user_id', user.id).then()
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

  // ── Offline mode actions ──────────────────────────────────────────────────

  const enableOfflineMode = useCallback(async () => {
    if (!user) return
    setIsCaching(true)
    setOfflineEnabled(true)
    setOfflineModeEnabled(true)
    setCachedUserId(user.id)

    // Snapshot current progress and question totals to localStorage
    const completedIds = Object.keys(store).filter(k => store[k])
    setCachedProgress(completedIds)
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
  }, [user, store])

  const disableOfflineMode = useCallback(async () => {
    // Flush pending ops if online before disabling
    if (isOnline && user && getPendingOps().length > 0) {
      setIsSyncing(true)
      await flushPendingOps(user.id)
      setPendingOpsCount(0)
      setIsSyncing(false)
    }
    clearPendingOps()
    setOfflineEnabled(false)
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
    const ok = await flushPendingOps(user.id)
    if (ok) {
      setPendingOpsCount(0)
      const now = new Date().toISOString()
      setCachedAt(now)
      setCachedAtState(now)
    }
    setIsSyncing(false)
  }, [user, isSyncing])

  return (
    <ProgressContext.Provider value={{
      isComplete, toggle, setMany, resetAll, sectionStats, allStats, stats, setSectionTotal, mounted,
      user, signInWithGitHub, signOut,
      isOnline, offlineModeEnabled, isCaching, cachingProgress, pendingOpsCount, isSyncing, cachedAt,
      enableOfflineMode, disableOfflineMode, syncNow,
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
