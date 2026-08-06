'use client';

// Thin compatibility layer over the Zustand store (lib/stores/appStore.ts) —
// every consumer still does `import { useProgress } from '@/lib/context/ProgressContext'`
// and destructures the exact same fields it always has, but the actual state
// now lives in Zustand (see components/StoreBootstrap.tsx, which replaces the
// old <ProgressProvider> wrapper in app/layout.tsx). `useShallow` keeps this
// hook's returned object referentially stable across renders where nothing
// selected here actually changed, matching the old Context's re-render
// characteristics rather than making them worse.
import { useCallback, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '../stores/appStore';
import { useTopicGroups } from './TopicsContext';
import { useInitialTotals } from './TotalsContext';
import { computeStats, computeSectionStats } from '../stores/progressSelectors';

export function useProgress() {
  const state = useAppStore(
    useShallow((s) => ({
      store: s.store,
      totals: s.totals,
      mounted: s.mounted,
      setSectionTotal: s.setSectionTotal,
      toggle: s.toggle,
      setMany: s.setMany,
      resetAll: s.resetAll,
      renameProgressId: s.renameProgressId,
      // Counts only — the inbox/set-aside/starred *mutators* are read straight
      // off the store by the components that call them.
      inboxCount: s.inboxCount,
      setAsideCount: s.setAsideCount,
      appendSetAsideItem: s.appendSetAsideItem,
      starredCount: s.starredCount,
      bumpStarredCount: s.bumpStarredCount,
      // Question order
      orderStore: s.orderStore,
      setQuestionOrder: s.setQuestionOrder,
      renameOrderId: s.renameOrderId,
      // Auth — `user` only; signInWithGitHub/signOut are read off the store.
      user: s.user,
      // Settings are NOT exposed here — read them straight off the store with
      // `useAppStore((s) => s.defaultSort)` etc. (see features/settings/store/settingsSlice.ts).
      // Offline mode
      isOnline: s.isOnline,
      offlineModeEnabled: s.offlineModeEnabled,
      isCaching: s.isCaching,
      cachingProgress: s.cachingProgress,
      pendingOpsCount: s.pendingOpsCount,
      isSyncing: s.isSyncing,
      cachedAt: s.cachedAt,
      enableOfflineMode: s.enableOfflineMode,
      disableOfflineMode: s.disableOfflineMode,
      syncNow: s.syncNow,
    })),
  );

  const { store, orderStore, mounted } = state;

  // Computed here (not read from the store's own `stats`/groups/totals
  // fields) so it stays correct synchronously during render — groups and
  // initialTotals come from server-provided context values available
  // immediately, whereas mirroring them into the Zustand store happens in a
  // StoreBootstrap effect that only runs after mount. Relying on the store
  // alone would flash "0 questions" on first paint until that effect fires.
  // state.totals only ever holds per-section refinements from
  // setSectionTotal (seeded from '' and merged on top of initialTotals here)
  // plus, once StoreBootstrap's effect runs, a full copy of initialTotals
  // itself — so this merge is stable (harmlessly redundant) after mount.
  const groups = useTopicGroups();
  const initialTotals = useInitialTotals();
  const totals = useMemo(
    () => ({ ...initialTotals, ...state.totals }),
    [initialTotals, state.totals],
  );
  const stats = useMemo(
    () => computeStats(store, totals, groups),
    [store, totals, groups],
  );

  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted],
  );

  const sectionStats = useCallback(
    (topic: string, file: string, total: number) => {
      if (!mounted) return { done: 0, total };
      return computeSectionStats(store, topic, file, total);
    },
    [store, mounted],
  );

  const getOrderPosition = useCallback(
    (id: string) => (mounted ? (orderStore[id] ?? null) : null),
    [orderStore, mounted],
  );

  // The three raw maps stay private — they're inputs to the derived values
  // below (`stats`, `isComplete`, `getOrderPosition`), and no consumer has
  // ever read them directly. `totals` in particular is the store's unmerged
  // copy, so exposing it would hand out the wrong numbers.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { store: _s, totals: _t, orderStore: _o, ...rest } = state;
  return {
    ...rest,
    stats,
    isComplete,
    sectionStats,
    getOrderPosition,
  };
}
