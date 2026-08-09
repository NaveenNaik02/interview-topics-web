'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { computeSectionStats } from '@/lib/stores/progressSelectors';
import FilterSortToolbar, {
  type PriorityFilterKey,
  type StatusFilter,
} from './FilterSortToolbar';
import type { SortMode } from '@/features/settings';
import type { TopicGroup, SectionMeta } from '@/lib/topics';

interface SectionHeaderProps {
  group: TopicGroup;
  section: SectionMeta;
  total: number;
  filterSet: Set<PriorityFilterKey>;
  statusFilter: StatusFilter;
  sortMode: SortMode;
  counts: { high: number; med: number; low: number; none: number };
  onTogglePriority: (key: PriorityFilterKey) => void;
  onToggleStatus: (v: 'done' | 'notdone') => void;
  onSetSort: (mode: SortMode) => void;
  onClear: () => void;
  onSelectAll: () => void;
  onUnselectAll: () => void;
}

const SectionHeader = ({
  group,
  section,
  total,
  filterSet,
  statusFilter,
  sortMode,
  counts,
  onTogglePriority,
  onToggleStatus,
  onSetSort,
  onClear,
  onSelectAll,
  onUnselectAll,
}: SectionHeaderProps) => {
  const { store, mounted } = useAppStore(
    useShallow((s) => ({
      store: s.store,
      mounted: s.mounted,
    })),
  );

  const stats = useMemo(() => {
    if (!mounted) return { done: 0, total };
    return computeSectionStats(store, section.topic, section.file, total);
  }, [store, mounted, section.topic, section.file, total]);

  const pct = useMemo(() => {
    return stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  }, [stats]);

  const allDone = mounted && stats.done === stats.total && stats.total > 0;
  const noneDone = !mounted || stats.done === 0;

  return (
    <div className="subtopic-header">
      <div className="eyebrow">{group.groupName}</div>
      <h1 className="subtopic-title">{section.label}</h1>
      <div className="subtopic-meta">
        <span className="meta-stat">
          <strong>{mounted ? stats.done : 0}</strong> of{' '}
          <strong>{stats.total}</strong> complete
        </span>
        <div className="bar">
          <div
            className="bar-fill"
            style={{ width: `${mounted ? pct : 0}%` }}
          />
        </div>
        <span
          className="meta-stat"
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          {mounted ? pct : 0}%
        </span>
      </div>
      <FilterSortToolbar
        filterSet={filterSet}
        statusFilter={statusFilter}
        sortMode={sortMode}
        counts={counts}
        onTogglePriority={onTogglePriority}
        onToggleStatus={onToggleStatus}
        onSetSort={onSetSort}
        onClear={onClear}
        onSelectAll={onSelectAll}
        onUnselectAll={onUnselectAll}
        allDone={allDone}
        noneDone={noneDone}
      />
    </div>
  );
};

export default SectionHeader;
