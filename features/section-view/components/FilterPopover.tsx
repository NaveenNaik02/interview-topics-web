'use client';

import { useMemo } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import { usePathname } from 'next/navigation';
import { computePriorityStats } from '@/lib/stores/progressSelectors';
import { findSection } from '@/lib/content/topics';
import * as Icon from '@/components/Icons';
import type { PriorityFilterKey } from '../store/types';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { ParsedQuestion } from '@/lib/content/parser';

const EMPTY_ARRAY: ParsedQuestion[] = [];

const PRI_MC: { k: PriorityFilterKey; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: 'none', label: 'None' },
];

interface FilterPopoverProps {
  onClose: () => void;
}

const PriorityFilterSection = () => {
  const pathname = usePathname();
  const {
    filterSet,
    togglePriorityFilter,
    questions,
    groups,
  } = useAppStore(
    useShallow((s) => ({
      filterSet: s.filterSet,
      togglePriorityFilter: s.togglePriorityFilter,
      questions: s.sectionQuestionsCache[pathname] || EMPTY_ARRAY,
      groups: s.groups,
    })),
  );

  const counts = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    const section = findSection(groups, segments);
    if (!section) return { high: 0, med: 0, low: 0, none: 0 };

    const map: Record<string, PriorityLevel> = {};
    questions.forEach((q) => {
      if (q.priority) map[q.id] = q.priority;
    });
    return computePriorityStats(
      map,
      section.topic,
      section.file,
      questions.length,
    );
  }, [questions, pathname, groups]);

  return (
    <div className="fpop-sec">
      <div className="fpop-lab">Priority</div>
      <div className="mini-chips">
        {PRI_MC.map(({ k, label }) => (
          <button
            key={k}
            type="button"
            className={`mc ${k} ${filterSet.has(k) ? 'on' : ''}`}
            onClick={() => togglePriorityFilter(k)}
          >
            <span className="mc-dot" />
            {label} <span className="mc-ct">{counts[k]}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const StatusFilterSection = () => {
  const { statusFilter, toggleStatusFilter } = useAppStore(
    useShallow((s) => ({
      statusFilter: s.statusFilter,
      toggleStatusFilter: s.toggleStatusFilter,
    })),
  );

  return (
    <div className="fpop-sec">
      <div className="fpop-lab">Status</div>
      <div className="mini-chips">
        <button
          type="button"
          className={`mc done ${statusFilter === 'done' ? 'on' : ''}`}
          onClick={() => toggleStatusFilter('done')}
        >
          <Icon.Check />Done
        </button>
        <button
          type="button"
          className={`mc ${statusFilter === 'notdone' ? 'on' : ''}`}
          onClick={() => toggleStatusFilter('notdone')}
        >
          <Icon.Circle />Not done
        </button>
      </div>
    </div>
  );
};

interface FilterPopoverFooterProps {
  onClose: () => void;
}

const FilterPopoverFooter = ({ onClose }: FilterPopoverFooterProps) => {
  const { filterSet, statusFilter, clearFilters } = useAppStore(
    useShallow((s) => ({
      filterSet: s.filterSet,
      statusFilter: s.statusFilter,
      clearFilters: s.clearFilters,
    })),
  );

  const count = filterSet.size + (statusFilter ? 1 : 0);

  return (
    <div className="fpop-foot">
      <button
        type="button"
        className="fpop-clear"
        onClick={clearFilters}
        disabled={!count}
      >
        Clear all
      </button>
      <button
        type="button"
        className="fpop-done"
        onClick={onClose}
      >
        Done
      </button>
    </div>
  );
};

export const FilterPopover = ({ onClose }: FilterPopoverProps) => {
  return (
    <div className="fpop" role="dialog" aria-label="Filter">
      <PriorityFilterSection />
      <StatusFilterSection />
      <FilterPopoverFooter onClose={onClose} />
    </div>
  );
};
