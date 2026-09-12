'use client';

import { useAppStore } from '@/lib/stores/appStore';
import type { SortMode } from '../types';

const SORT_OPTIONS: { k: SortMode; label: string }[] = [
  { k: 'manual', label: 'Manual (curriculum order)' },
  { k: 'high', label: 'High priority first' },
  { k: 'low', label: 'Low priority first' },
];

const SortOrderPicker = () => {
  const defaultSort = useAppStore((s) => s.defaultSort);
  const setDefaultSort = useAppStore((s) => s.setDefaultSort);

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
};

export default SortOrderPicker;
