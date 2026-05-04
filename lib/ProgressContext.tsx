'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

type ProgressStore = Record<string, boolean>

interface ProgressContextType {
  isComplete: (id: string) => boolean
  toggle: (id: string) => void
  resetAll: () => void
  sectionStats: (topic: string, file: string, total: number) => { done: number; total: number }
  allStats: (sections: { topic: string; file: string; total: number }[]) => { done: number; total: number }
  mounted: boolean
}

const ProgressContext = createContext<ProgressContextType | null>(null)

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<ProgressStore>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    async function init() {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data, error } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              initial_visit: new Date().toISOString()
            }
          }
        })
        if (error) {
          console.error('Anonymous sign-in failed:', error.message)
          return
        }
        session = data.session
      }
      if (!session) return

      const uid = session.user.id
      const { data: rows } = await supabase
        .from('progress')
        .select('question_id')
        .eq('user_id', uid)

      const initialStore: ProgressStore = {}
      rows?.forEach(r => { initialStore[r.question_id] = true })
      setStore(initialStore)
      setUserId(uid)
      setMounted(true)
    }
    init()
  }, [])

  const toggle = useCallback((id: string) => {
    if (!userId) return
    setStore(prev => {
      const next = { ...prev, [id]: !prev[id] }
      if (next[id]) {
        supabase.from('progress').upsert({ user_id: userId, question_id: id }).then()
      } else {
        supabase.from('progress').delete().eq('user_id', userId).eq('question_id', id).then()
      }
      return next
    })
  }, [userId])

  const resetAll = useCallback(() => {
    if (!userId) return
    setStore({})
    supabase.from('progress').delete().eq('user_id', userId).then()
  }, [userId])

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
    <ProgressContext.Provider value={{ isComplete, toggle, resetAll, sectionStats, allStats, mounted }}>
      {children}
    </ProgressContext.Provider>
  )
}

export function useProgress() {
  const ctx = useContext(ProgressContext)
  if (!ctx) throw new Error('useProgress must be used within ProgressProvider')
  return ctx
}
