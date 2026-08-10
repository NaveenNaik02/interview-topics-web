'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import type { PriorityFilterKey } from '../store/types';

const PRI_MC: { k: PriorityFilterKey; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: 'none', label: 'None' },
];

export const useActiveTokens = () => {
  const {
    filterSet,
    statusFilter,
    togglePriorityFilter,
    toggleStatusFilter,
  } = useAppStore(
    useShallow((s) => ({
      filterSet: s.filterSet,
      statusFilter: s.statusFilter,
      togglePriorityFilter: s.togglePriorityFilter,
      toggleStatusFilter: s.toggleStatusFilter,
    })),
  );

  const activeTokens = useMemo(() => {
    const tokens: {
      key: string;
      cls: string;
      label: string;
      dot: boolean;
      remove: () => void;
    }[] = [];

    for (const { k, label } of PRI_MC) {
      if (filterSet.has(k)) {
        tokens.push({
          key: k,
          cls: k,
          label,
          dot: true,
          remove: () => togglePriorityFilter(k),
        });
      }
    }

    if (statusFilter === 'done') {
      tokens.push({
        key: 'status',
        cls: 'done',
        label: 'Done',
        dot: false,
        remove: () => toggleStatusFilter('done'),
      });
    } else if (statusFilter === 'notdone') {
      tokens.push({
        key: 'status',
        cls: 'status',
        label: 'Not done',
        dot: false,
        remove: () => toggleStatusFilter('notdone'),
      });
    }

    return tokens;
  }, [filterSet, statusFilter, togglePriorityFilter, toggleStatusFilter]);

  const hasFilters = filterSet.size > 0 || !!statusFilter;

  return { activeTokens, hasFilters, statusFilter };
};
