import type { StateCreator } from 'zustand'
import * as inboxDb from '@/lib/db/inbox'
import * as inboxActions from '@/lib/actions/inbox'
import type { AppState, InboxSlice } from '../types'

// No offline cache here — capturing/assigning inbox items is an
// authoring-adjacent action (like addQuestion itself), which this app
// already treats as online-only rather than queueing through the
// pending-ops sync path.
export const createInboxSlice: StateCreator<AppState, [], [], InboxSlice> = (set, get) => ({
  inboxItems: [],

  // Capture and delete go through the server action directly from the
  // calling component (mirroring addQuestion/addTopicGroup, which also call
  // their actions directly rather than through the store) so the capture
  // modal can await success/failure — these two just keep the shared list
  // in sync afterward.
  appendInboxItem: (item) => {
    set({ inboxItems: [item, ...get().inboxItems] })
  },

  appendInboxItems: (items) => {
    set({ inboxItems: [...items, ...get().inboxItems] })
  },

  removeInboxItem: (id) => {
    if (!get().user) return
    set({ inboxItems: get().inboxItems.filter(it => it.id !== id) })
    inboxActions.deleteInboxItem(id).catch(err => console.error('[inbox] delete failed:', err))
  },

  loadInbox: async (uid: string) => {
    const items = await inboxDb.fetchInboxItems(uid)
    set({ inboxItems: items })
  },
})
