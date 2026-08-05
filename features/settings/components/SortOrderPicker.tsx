'use client';

import { useProgress } from '@/lib/context/ProgressContext';
import type { SortMode } from '@/components/FilterSortToolbar';
import { SORT_OPTIONS } from './constants';

// `initial` is the server-fetched value, rendered until the store finishes
// hydrating (see SettingsClient) so returning users don't see a flash of
// the wrong pill selected.
export default function SortOrderPicker({ initial }: { initial: SortMode }) {
  const {
    settingsLoaded,
    defaultSort: liveDefaultSort,
    setDefaultSort,
  } = useProgress();
  const defaultSort = settingsLoaded ? liveDefaultSort : initial;

  return (
    <div className="sort-pill-group">
      {SORT_OPTIONS.map((o) => (
        <button
          key={o.k}
          className={`sort-pill ${defaultSort === o.k ? 'on' : ''}`}
          onClick={() => setDefaultSort(o.k)}
          aria-pressed={defaultSort === o.k}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
