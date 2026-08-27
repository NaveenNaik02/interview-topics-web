'use client';

import { createContext, useContext } from 'react';
import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createProgressSlice } from './slices/progressSlice';
import { createSettingsSlice } from '@/features/settings/store/settingsSlice';
import { createInboxSlice } from '@/features/inbox/store/inboxSlice';
import { createSetAsideSlice } from './slices/setAsideSlice';
import { createFlagCountsSlice } from './slices/flagCountsSlice';
import { createOfflineSlice } from './slices/offlineSlice';
import { createQuestionOrderSlice } from './slices/questionOrderSlice';
import { createSectionQuestionsSlice } from '@/features/section-view/store/sectionQuestionsSlice';
import { computeStats } from './progressSelectors';
import type { TopicGroup } from '@/lib/topics';
import type { AppState } from './types';

export interface StoreInit {
  groups: TopicGroup[];
  totals: Record<string, number>;
}

// One store per request/tree, not a module singleton: the store is constructed
// with the server's data already in it, so `groups`/`totals`/`stats` are
// correct on the very first render instead of a post-mount effect away. It
// also means a server render can never hand one account's owner-scoped topics
// to the next request, which a module-level create() would risk the moment
// anything wrote to it during render.
export const createAppStore = (init: StoreInit) =>
  createStore<AppState>()((...a) => ({
    ...createAuthSlice(...a),
    ...createProgressSlice(...a),
    ...createSettingsSlice(...a),
    ...createInboxSlice(...a),
    ...createSetAsideSlice(...a),
    ...createFlagCountsSlice(...a),
    ...createOfflineSlice(...a),
    ...createQuestionOrderSlice(...a),
    ...createSectionQuestionsSlice(...a),
    // Seeded after the slices so these win over their empty defaults.
    groups: init.groups,
    totals: init.totals,
    stats: computeStats({}, init.totals, init.groups),
  }));

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
