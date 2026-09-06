import type { StateCreator } from 'zustand';
import * as inboxActions from '../actions';
import type { AppState, InboxSlice } from '@/lib/stores/types';

// No offline cache here — capturing/assigning inbox items is an
// authoring-adjacent action (like addQuestion itself), which this app
// already treats as online-only rather than queueing through the
// pending-ops sync path.
//
// Only a count is kept here (for the Sidebar badge), seeded from the server
// by StoreProvider — full item bodies live page-side, fetched by the Inbox
// page itself via fetchInitialInboxPageData and kept fresh via
// revalidatePath('/inbox') in the mutating actions.
export const createInboxSlice: StateCreator<AppState, [], [], InboxSlice> = (
  set,
  get,
) => ({
  inboxCount: 0,

  // Capture and delete go through the server action directly from the
  // calling component (mirroring addQuestion/addTopicGroup, which also call
  // their actions directly rather than through the store) so the capture
  // modal can await success/failure — these two just keep the badge count
  // in sync afterward.
  appendInboxItem: () => {
    set({ inboxCount: get().inboxCount + 1 });
  },

  appendInboxItems: (items) => {
    set({ inboxCount: get().inboxCount + items.length });
  },

  removeInboxItem: (id) => {
    if (!get().user) return;
    set({ inboxCount: Math.max(0, get().inboxCount - 1) });
    inboxActions
      .deleteInboxItem(id)
      .catch((err) => console.error('[inbox] delete failed:', err));
  },
});
