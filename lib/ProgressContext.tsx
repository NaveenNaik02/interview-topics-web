'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

type ProgressStore = Record<string, boolean>

interface ProgressContextType {
  isComplete: (id: string) => boolean
  toggle: (id: string) => void
  resetAll: () => void
  sectionStats: (topic: string, file: string, total: number) => { done: number; total: number }
  allStats: (sections: { topic: string; file: string; total: number }[]) => { done: number; total: number }
  mounted: boolean
  user: User | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
}

const ProgressContext = createContext<ProgressContextType | null>(null)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ProgressStore>({})
  const [user, setUser] = useState<User | null>(null)
  const [mounted, setMounted] = useState(false)

  const loadProgress = useCallback(async (uid: string) => {
    const { data: rows } = await supabase
      .from('progress')
      .select('question_id')
      .eq('user_id', uid)

    const initialStore: ProgressStore = {}
    rows?.forEach(r => { initialStore[r.question_id] = true })
    setStore(initialStore)
    setMounted(true)
  }, [])

  useEffect(() => {
    // 1. Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
      } else {
        // Only sign in anonymously if no session exists at all
        supabase.auth.signInAnonymously().then(({ data: { session: anonSession } }) => {
          if (anonSession) {
            setUser(anonSession.user)
            loadProgress(anonSession.user.id)
          }
        })
      }
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
        loadProgress(session.user.id)
        
        // Remove hash from URL after successful login (Implicit flow leaves a #)
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
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) console.error('GitHub sign-in failed:', error.message)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    // Resetting state is handled by onAuthStateChange listener
  }

  const toggle = useCallback((id: string) => {
    if (!user) return
    setStore(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id]) {
        supabase.from('progress').upsert({ user_id: user.id, question_id: id }).then()
      } else {
        supabase.from('progress').delete().eq('user_id', user.id).eq('question_id', id).then()
      }
      return next
    })
  }, [user])

  const resetAll = useCallback(() => {
    if (!user) return
    setStore({})
    supabase.from('progress').delete().eq('user_id', user.id).then()
  }, [user])

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
        const stats = sectionStats(s.topic, s.file, s.total)
        totalQ += s.total
        doneQ += stats.done
      }
      return { done: doneQ, total: totalQ }
    },
    [sectionStats]
  )

  return (
    <ProgressContext.Provider value={{ 
      isComplete, toggle, resetAll, sectionStats, allStats, mounted, 
      user, signInWithGitHub, signOut 
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
