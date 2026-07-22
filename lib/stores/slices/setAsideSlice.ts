import type { StateCreator } from 'zustand'
import * as setAsideDb from '@/lib/db/setAside'
import * as setAsideActions from '@/lib/actions/setAside'
import type { AppState, SetAsideSlice } from '../types'

// Mirrors inboxSlice — "set aside" is authoring-adjacent (removes a question
// from `questions`), so like addQuestion/setAsideQuestion it's called
// directly from the calling component rather than through the store; this
// slice just keeps the shared list in sync afterward.
export const createSetAsideSlice: StateCreator<AppState, [], [], SetAsideSlice> = (set, get) => ({
  setAsideItems: [],

  appendSetAsideItem: (item) => {
    set({ setAsideItems: [item, ...get().setAsideItems] })
  },

  removeSetAsideItem: (id) => {
    if (!get().user) return
    set({ setAsideItems: get().setAsideItems.filter(it => it.id !== id) })
    setAsideActions.discardSetAsideItem(id).catch(err => console.error('[set-aside] delete failed:', err))
  },

  loadSetAside: async (uid: string) => {
    const items = await setAsideDb.fetchSetAsideItems(uid)
    set({ setAsideItems: items })
  },
})
