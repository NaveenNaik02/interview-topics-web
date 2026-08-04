import type { StateCreator } from 'zustand';
import * as setAsideDb from '@/lib/db/setAside';
import * as setAsideActions from '@/lib/actions/setAside';
import type { AppState, SetAsideSlice } from '../types';

// Mirrors inboxSlice — "set aside" is authoring-adjacent (removes a question
// from `questions`), so like addQuestion/setAsideQuestion it's called
// directly from the calling component rather than through the store; this
// slice just keeps the badge count in sync afterward. Full item bodies live
// page-side, fetched by the Inbox page itself and kept fresh via
// revalidatePath('/inbox') in the mutating actions.
export const createSetAsideSlice: StateCreator<
  AppState,
  [],
  [],
  SetAsideSlice
> = (set, get) => ({
  setAsideCount: 0,

  appendSetAsideItem: () => {
    set({ setAsideCount: get().setAsideCount + 1 });
  },

  removeSetAsideItem: (id) => {
    if (!get().user) return;
    set({ setAsideCount: Math.max(0, get().setAsideCount - 1) });
    setAsideActions
      .discardSetAsideItem(id)
      .catch((err) => console.error('[set-aside] delete failed:', err));
  },

  loadSetAsideCount: async (uid: string) => {
    const count = await setAsideDb.fetchSetAsideCount(uid);
    set({ setAsideCount: count });
  },
});
