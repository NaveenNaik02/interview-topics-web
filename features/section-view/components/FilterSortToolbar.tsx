'use client';

import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { BulkSelectionButtons } from './BulkSelectionButtons';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterMenu } from './FilterMenu';
import * as Icon from '@/components/Icons';
import type { SortMode } from '@/features/settings';

const SORT_LABEL: Record<SortMode, string> = {
  manual: 'Manual',
  high: 'High first',
  low: 'Low first',
};
const SORT_CYCLE: Record<SortMode, SortMode> = {
  manual: 'high',
  high: 'low',
  low: 'manual',
};

export default function FilterSortToolbar() {
  const { sortMode, setSortMode } = useAppStore(
    useShallow((s) => ({
      sortMode: s.sortMode,
      setSortMode: s.setSortMode,
    })),
  );

  return (
    <div className="section-toolbar">
      <BulkSelectionButtons />
      <ActiveFilterChips />
      <FilterMenu />
      <button
        type="button"
        className="action-chip"
        onClick={() => setSortMode(SORT_CYCLE[sortMode])}
        title="Change sort order"
      >
        <Icon.Sort />
        {SORT_LABEL[sortMode]}
      </button>
    </div>
  );
}
