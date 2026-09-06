import type { StateCreator } from 'zustand'
import * as progressDb from '@/lib/db/progress'
import * as progressActions from '@/lib/actions/progress'
import {
  getOfflineEnabled,
  getCachedProgress, setCachedProgress,
  getPendingOps, appendPendingOp, getPendingPriorityOps,
} from '@/lib/offlineSync'
import { computeStats } from '../progressSelectors'
import type { AppState, ProgressSlice } from '../types'

export const createProgressSlice: StateCreator<AppState, [], [], ProgressSlice> = (set, get) => {
  // Recomputes the aggregate `stats` object after any mutation to `store`,
  // `totals`, or `groups` — the store equivalent of the old
  // `useMemo(() => ..., [store, totals, groups])`.
  const recomputeStats = () => {
    const { store, totals, groups } = get()
    set({ stats: computeStats(store, totals, groups) })
  }

  return {
    store: {},
    totals: {},
    groups: [],
    stats: computeStats({}, {}, []),
    mounted: false,

    setInitialTotals: (totals: Record<string, number>) => {
      set({ totals })
      recomputeStats()
    },

    setSectionTotal: (url: string, total: number) => {
      const prev = get().totals
      if (prev[url] === total) return
      set({ totals: { ...prev, [url]: total } })
      recomputeStats()
    },

    setGroups: (groups) => {
      set({ groups })
      recomputeStats()
    },

    // NOTE: side effects (Server Action calls, localStorage writes) must stay
    // OUTSIDE the state update below — Server Actions touch the Next.js
    // Router internally, which the original ProgressContext explicitly
    // guarded against calling from inside a React setState updater. Zustand's
    // `set` isn't a React updater, but keeping the same ordering here anyway
    // for parity with the documented constraint.
    toggle: (id: string) => {
      const { user, store, isOnline, offlineModeEnabled } = get()
      if (!user) return
      const isAdd = !store[id]
      const action = isAdd ? 'add' : 'remove'
      set({ store: { ...store, [id]: isAdd } })
      recomputeStats()

      if (!isOnline && offlineModeEnabled) {
        appendPendingOp({ questionId: id, action, ts: Date.now() })
        set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length })
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
    },

    setMany: (ids: string[], value: boolean) => {
      const { user, store, isOnline, offlineModeEnabled } = get()
      if (!user) return
      const next = { ...store }
      for (const id of ids) next[id] = value
      set({ store: next })
      recomputeStats()

      if (!isOnline && offlineModeEnabled) {
        const ts = Date.now()
        ids.forEach(id => appendPendingOp({ questionId: id, action: value ? 'add' : 'remove', ts }))
        set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length })
        const cached = getCachedProgress()
        if (value) {
          setCachedProgress([...new Set([...cached, ...ids])])
        } else {
          const removeSet = new Set(ids)
          setCachedProgress(cached.filter(q => !removeSet.has(q)))
        }
      } else {
        const targetIds = value
          ? ids.filter((id) => !store[id])
          : ids.filter((id) => store[id]);

        if (targetIds.length > 0) {
          const write = value
            ? progressActions.bulkUpsertProgress(targetIds)
            : progressActions.bulkDeleteProgress(targetIds);
          write.catch((err) => {
            console.error('[progress] bulk write failed:', err);
            // Rollback on failure
            set({ store });
            recomputeStats();
          });
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
    },

    pruneSectionProgress: (topic: string, file: string, ids: string[]) => {
      const { store } = get()
      const prefix = `${topic}/${file}/`
      const alive = new Set(ids)
      const next = Object.fromEntries(
        Object.entries(store).filter(([k]) => !k.startsWith(prefix) || alive.has(k))
      )
      if (Object.keys(next).length === Object.keys(store).length) return
      set({ store: next })
      recomputeStats()
    },

    renameProgressId: (oldId: string, newId: string) => {
      const { store } = get()
      if (!(oldId in store)) return
      const { [oldId]: value, ...rest } = store
      set({ store: { ...rest, [newId]: value } })
      recomputeStats()
    },

    resetAll: () => {
      const { user, store, isOnline, offlineModeEnabled } = get()
      if (!user) return
      if (!isOnline && offlineModeEnabled) {
        const completed = Object.keys(store).filter(k => store[k])
        const ts = Date.now()
        completed.forEach(id => appendPendingOp({ questionId: id, action: 'remove', ts }))
        set({ pendingOpsCount: getPendingOps().length + getPendingPriorityOps().length })
        setCachedProgress([])
      } else {
        progressActions.deleteAllProgress().catch(err => console.error('[progress] reset failed:', err))
        if (offlineModeEnabled) setCachedProgress([])
      }
      set({ store: {} })
      recomputeStats()
    },

    loadProgress: async (uid: string) => {
      const offlineEnabled = getOfflineEnabled()

      // Server-seeded at construction; nothing to fetch unless the offline
      // cache still needs reconciling.
      if (!offlineEnabled && get().mounted) return

      if (offlineEnabled) {
        const cached = getCachedProgress()
        // Hydrate immediately from cache if we have data or are offline
        if (cached.length > 0 || !navigator.onLine) {
          const initialStore: Record<string, boolean> = {}
          cached.forEach(id => { initialStore[id] = true })
          set({ store: initialStore, mounted: true })
          recomputeStats()

          // Background refresh from Supabase when online
          if (navigator.onLine) {
            progressDb.fetchProgress(uid).then(ids => {
              const freshStore: Record<string, boolean> = {}
              ids.forEach(id => { freshStore[id] = true })
              set({ store: freshStore })
              recomputeStats()
              setCachedProgress(ids)
            })
          }
          return
        }
      }

      const ids = await progressDb.fetchProgress(uid)
      const initialStore: Record<string, boolean> = {}
      ids.forEach(id => { initialStore[id] = true })
      set({ store: initialStore, mounted: true })
      recomputeStats()
      if (offlineEnabled) setCachedProgress(ids)
    },
  }
}
