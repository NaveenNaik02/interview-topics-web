import type { StateCreator } from 'zustand';
import * as starredDb from '@/features/starred/db';
import type { AppState, StarredSlice } from '../types';

// Count only — the Sidebar badge is the only thing that reads this
// globally. Full starred questions live page-side, fetched by the Starred
// page itself (see fetchStarredQuestionsWithClient) only when that page
// renders. Mirrors InboxSlice/SetAsideSlice.
export const createStarredSlice: StateCreator<
  AppState,
  [],
  [],
  StarredSlice
> = (set, get) => ({
  starredCount: 0,

  bumpStarredCount: (delta: number) => {
    set({ starredCount: Math.max(0, get().starredCount + delta) });
  },

  loadStarredCount: async (uid: string) => {
    const count = await starredDb.fetchStarredCount(uid);
    set({ starredCount: count });
  },
});
