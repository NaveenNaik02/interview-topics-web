'use client';

import { useAppStore } from './stores/appStore';

/**
 * Computed progress statistics. The store recomputes `stats` on every change
 * to progress/totals/groups (progressSlice.recomputeStats) and is constructed
 * with the server's totals+groups already in it, so this is a plain selector —
 * there's nothing left to merge in at the call site.
 */
export function useProgressStats() {
  return useAppStore((s) => s.stats);
}
