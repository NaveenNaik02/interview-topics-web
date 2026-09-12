import type { StateCreator } from 'zustand'
import * as progressDb from '@/lib/db/progress'
import * as progressActions from '@/lib/actions/progress'
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

    // NOTE: side effects (Server Action calls) must stay
    // OUTSIDE the state update below — Server Actions touch the Next.js
    // Router internally, which the original ProgressContext explicitly
    // guarded against calling from inside a React setState updater. Zustand's
    // `set` isn't a React updater, but keeping the same ordering here anyway
    // for parity with the documented constraint.
    toggle: (id: string) => {
      const { user, store } = get()
      if (!user) return
      const isAdd = !store[id]
      set({ store: { ...store, [id]: isAdd } })
      recomputeStats()

      const write = isAdd ? progressActions.upsertProgress(id) : progressActions.deleteProgress(id)
      write.catch(err => console.error('[progress] write failed:', err))
    },

    setMany: (ids: string[], value: boolean) => {
      const { user, store } = get()
      if (!user) return
      const next = { ...store }
      for (const id of ids) next[id] = value
      set({ store: next })
      recomputeStats()

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
      const { user } = get()
      if (!user) return
      progressActions.deleteAllProgress().catch(err => console.error('[progress] reset failed:', err))
      set({ store: {} })
      recomputeStats()
    },

    loadProgress: async (uid: string) => {
      // Server-seeded at construction; nothing to fetch.
      if (get().mounted) return

      const ids = await progressDb.fetchProgress(uid)
      const initialStore: Record<string, boolean> = {}
      ids.forEach(id => { initialStore[id] = true })
      set({ store: initialStore, mounted: true })
      recomputeStats()
    },
  }
}
