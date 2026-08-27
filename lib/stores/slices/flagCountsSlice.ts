import type { StateCreator } from 'zustand';
import { fetchShortlistCounts } from '@/lib/db/shortlist';
import type { AppState, FlagCountsSlice } from '../types';

// Counts only — the Sidebar badges are the only thing that reads these
// globally. Full starred / grey-zone questions live page-side, fetched by
// those pages themselves (see fetchShortlistQuestions) only when they render.
// Mirrors InboxSlice/SetAsideSlice.
export const createFlagCountsSlice: StateCreator<
  AppState,
  [],
  [],
  FlagCountsSlice
> = (set, get) => ({
  flagCounts: { starred: 0, grey_zone: 0 },

  bumpFlagCount: (flag, delta) => {
    const counts = get().flagCounts;
    set({
      flagCounts: { ...counts, [flag]: Math.max(0, counts[flag] + delta) },
    });
  },

  loadFlagCounts: async (uid: string) => {
    set({ flagCounts: await fetchShortlistCounts(uid) });
  },
});
