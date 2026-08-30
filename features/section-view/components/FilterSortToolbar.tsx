'use client';

import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { MarkAllDoneToggle } from './MarkAllDoneToggle';
import { MultiDeleteControls } from './MultiDeleteControls';
import { ActiveFilterChips } from './ActiveFilterChips';
import { FilterMenu } from './FilterMenu';
import { useActiveTokens } from '../hooks';
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
  const { sortMode, setSortMode, selectMode } = useAppStore(
    useShallow((s) => ({
      sortMode: s.sortMode,
      setSortMode: s.setSortMode,
      selectMode: s.selectMode,
    })),
  );

  const { hasFilters } = useActiveTokens();

  // Select mode owns the toolbar — the filter/sort chips would only act on a
  // list the user is mid-selection in.
  if (selectMode) {
    return (
      <div className="section-toolbar">
        <MultiDeleteControls />
      </div>
    );
  }

  return (
    <div className="section-toolbar">
      <MarkAllDoneToggle />
      <MultiDeleteControls />
      {hasFilters && <span className="tb-divider" />}
      <div className="tb-chips">
        <ActiveFilterChips />
      </div>
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
