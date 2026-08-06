'use client';

import { useMemo } from 'react';
import { useAppStore } from './stores/appStore';
import { useTopicGroups } from './context/TopicsContext';
import { useInitialTotals } from './context/TotalsContext';
import { computeStats } from './stores/progressSelectors';

/**
 * Granular hook to get the computed progress statistics.
 * This hook is optimized to only trigger re-renders when the store's progress
 * or section totals change, preventing massive UI re-renders on every store update.
 */
export function useProgressStats() {
  const store = useAppStore((s) => s.store);
  const stateTotals = useAppStore((s) => s.totals);
  const groups = useTopicGroups();
  const initialTotals = useInitialTotals();

  const totals = useMemo(
    () => ({ ...initialTotals, ...stateTotals }),
    [initialTotals, stateTotals],
  );

  return useMemo(
    () => computeStats(store, totals, groups),
    [store, totals, groups],
  );
}
