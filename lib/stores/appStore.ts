'use client';

import { createContext, useContext } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  createSettingsSlice,
  settingsStateFrom,
} from '@/features/settings/store/settingsSlice';
import { createInboxSlice } from '@/features/inbox/store/inboxSlice';
import { createSectionQuestionsSlice } from '@/features/section-view/store/sectionQuestionsSlice';
import type { TopicGroup } from '@/lib/content/topics';
import type { ShortlistFlag } from '@/lib/db/shortlist';
import type { UserSettings } from '@/features/settings/db/db';
import { createAuthSlice } from './slices/authSlice';
import { createProgressSlice } from './slices/progressSlice';
import { createSetAsideSlice } from './slices/setAsideSlice';
import { createFlagCountsSlice } from './slices/flagCountsSlice';
import { createQuestionOrderSlice } from './slices/questionOrderSlice';
import { computeStats } from './progressSelectors';
import type { AppState } from './types';

export interface StoreInit {
  groups: TopicGroup[];
  totals: Record<string, number>;
  flagCounts?: Record<ShortlistFlag, number>;
  inboxCount?: number;
  setAsideCount?: number;
  settingsRow?: UserSettings | null;
  progressIds?: string[];
}

// One store per request/tree, not a module singleton: the store is constructed
// with the server's data already in it, so `groups`/`totals`/`stats` are
// correct on the very first render instead of a post-mount effect away. It
// also means a server render can never hand one account's owner-scoped topics
// to the next request, which a module-level create() would risk the moment
// anything wrote to it during render.
// `progressIds` is destructured out because it is the one StoreInit field
// that is not an AppState field — it becomes the `store` map below.
export const createAppStore = ({ progressIds, ...init }: StoreInit) =>
  createStore<AppState>()((...a) => {
    const store = Object.fromEntries((progressIds ?? []).map((id) => [id, true]));

    return {
      ...createAuthSlice(...a),
      ...createProgressSlice(...a),
      ...createSettingsSlice(...a),
      ...createInboxSlice(...a),
      ...createSetAsideSlice(...a),
      ...createFlagCountsSlice(...a),
      ...createQuestionOrderSlice(...a),
      ...createSectionQuestionsSlice(...a),
      // Completed questions, server-fetched: without them every sidebar bar
      // and dashboard percentage renders at 0% until a client fetch lands.
      store,
      mounted: progressIds !== undefined,
      stats: computeStats(store, init.totals, init.groups),
      // Every remaining StoreInit field is an AppState field, spread last so
      // the server's values win over the slices' empty defaults. The optional
      // ones are the Sidebar badge counts and the saved settings row, omitted
      // by tests that don't care about them.
      ...init,
      // Derived from the seeded row, so the saved sort/theme/presets beat the
      // slice's DEFAULT_SETTINGS placeholders on the very first render.
      ...(init.settingsRow ? settingsStateFrom(init.settingsRow) : {}),
    };
  });

export type AppStoreApi = ReturnType<typeof createAppStore>;

export const StoreContext = createContext<AppStoreApi | null>(null);

/** Imperative handle — getState/setState/subscribe outside of render. */
export function useAppStoreApi(): AppStoreApi {
  const store = useContext(StoreContext);
  if (!store)
    throw new Error('useAppStore must be used within a StoreProvider');
  return store;
}

export function useAppStore<T>(selector: (state: AppState) => T): T {
  return useStore(useAppStoreApi(), selector);
}
