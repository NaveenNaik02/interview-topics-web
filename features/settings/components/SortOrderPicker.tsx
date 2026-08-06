'use client';

import { useAppStore } from '@/lib/stores/appStore';
import type { SortMode } from '@/components/FilterSortToolbar';

const SORT_OPTIONS: { k: SortMode; label: string }[] = [
  { k: 'manual', label: 'Manual (curriculum order)' },
  { k: 'high', label: 'High priority first' },
  { k: 'low', label: 'Low priority first' },
];

// `initial` is the server-fetched value, rendered until the store finishes
// hydrating (see SettingsClient) so returning users don't see a flash of
// the wrong pill selected.
export default function SortOrderPicker({ initial }: { initial: SortMode }) {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const liveDefaultSort = useAppStore((s) => s.defaultSort);
  const setDefaultSort = useAppStore((s) => s.setDefaultSort);
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
