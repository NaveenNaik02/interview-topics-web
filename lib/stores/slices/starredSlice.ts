import type { StateCreator } from 'zustand'
import * as starredDb from '@/lib/db/starred'
import * as starredActions from '@/lib/actions/starred'
import type { AppState, StarredSlice } from '../types'

// Row-presence-as-state, same shape as progressSlice — but no offline queue
// (see plan notes): starring is a hand-curation action, not something
// toggled constantly during an offline study session, so writes just
// require being online while the in-memory store still updates optimistically.
export const createStarredSlice: StateCreator<AppState, [], [], StarredSlice> = (set, get) => ({
  starredStore: {},

  toggleStar: (id: string) => {
    const { user, starredStore } = get()
    if (!user) return
    const isAdd = !starredStore[id]
    set({ starredStore: { ...starredStore, [id]: isAdd } })

    const write = isAdd ? starredActions.upsertStarred(id) : starredActions.deleteStarred(id)
    write.catch(err => console.error('[starred] write failed:', err))
  },

  renameStarId: (oldId: string, newId: string) => {
    const { starredStore } = get()
    if (!(oldId in starredStore)) return
    const { [oldId]: value, ...rest } = starredStore
    set({ starredStore: { ...rest, [newId]: value } })
  },

  loadStarred: async (uid: string) => {
    const ids = await starredDb.fetchStarred(uid)
    const store: Record<string, boolean> = {}
    ids.forEach(id => { store[id] = true })
    set({ starredStore: store })
  },
})
