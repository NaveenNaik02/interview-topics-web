import type { StateCreator } from 'zustand'
import * as priorityDb from '@/lib/db/priority'
import * as priorityActions from '@/lib/actions/priority'
import {
  getOfflineEnabled,
  getCachedPriority, setCachedPriority,
  getPendingOps, appendPendingPriorityOp, getPendingPriorityOps,
  type PriorityLevel,
} from '@/lib/offlineSync'
import type { AppState, PrioritySlice } from '../types'

export const createPrioritySlice: StateCreator<AppState, [], [], PrioritySlice> = (set, get) => ({
  priorityStore: {},

  setPriority: (id: string, level: PriorityLevel | null) => {
    if (!get().user) return
    const next = { ...get().priorityStore }
    if (level) next[id] = level; else delete next[id]
    set({ priorityStore: next })

    const { isOnline, offlineModeEnabled } = get()
    if (!isOnline && offlineModeEnabled) {
      appendPendingPriorityOp({ questionId: id, level, ts: Date.now() })
      set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length })
      setCachedPriority(next)
    } else {
      const write = level ? priorityActions.upsertPriority(id, level) : priorityActions.deletePriority(id)
      write.catch(err => console.error('[priority] write failed:', err))
      if (offlineModeEnabled) setCachedPriority(next)
    }
  },

  loadPriority: async (uid: string) => {
    const offlineEnabled = getOfflineEnabled()

    if (offlineEnabled) {
      const cached = getCachedPriority()
      if (Object.keys(cached).length > 0 || !navigator.onLine) {
        set({ priorityStore: cached })

        if (navigator.onLine) {
          priorityDb.fetchPriority(uid).then(fresh => {
            set({ priorityStore: fresh })
            setCachedPriority(fresh)
          })
        }
        return
      }
    }

    const initial = await priorityDb.fetchPriority(uid)
    set({ priorityStore: initial })
    if (offlineEnabled) setCachedPriority(initial)
  },
})
