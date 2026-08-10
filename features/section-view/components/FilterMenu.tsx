'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { FilterPopover } from './FilterPopover';
import * as Icon from '@/components/Icons';

export const FilterMenu = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { filterSet, statusFilter } = useAppStore(
    useShallow((s) => ({
      filterSet: s.filterSet,
      statusFilter: s.statusFilter,
    })),
  );

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const count = filterSet.size + (statusFilter ? 1 : 0);

  return (
    <div className="filter-menu" ref={ref}>
      <button
        type="button"
        className={`action-chip ${count ? 'active' : ''}`}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon.Filter />
        Filter {count > 0 && <span className="chip-badge">{count}</span>}
      </button>
      {open && <FilterPopover onClose={() => setOpen(false)} />}
    </div>
  );
};
