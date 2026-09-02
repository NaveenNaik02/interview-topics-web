'use client';

import { useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { computeSectionStats } from '@/lib/stores/progressSelectors';
import { findSection } from '@/lib/content/topics';
import { usePathname } from 'next/navigation';
import * as Icon from '@/components/Icons';
import BulkConfirmDialog from './BulkConfirmDialog';
import type { ParsedQuestion } from '@/lib/content/parser';

const EMPTY_ARRAY: ParsedQuestion[] = [];

export const MarkAllDoneToggle = () => {
  const pathname = usePathname();
  const { store, mounted, questions, groups } = useAppStore(
    useShallow((s) => ({
      store: s.store,
      mounted: s.mounted,
      questions: s.sectionQuestionsCache[pathname] || EMPTY_ARRAY,
      groups: s.groups,
    })),
  );

  const [confirm, setConfirm] = useState<'select' | 'unselect' | null>(null);

  const activeSection = useMemo(() => {
    const segments = pathname.split('/').filter(Boolean);
    return findSection(groups, segments);
  }, [pathname, groups]);

  const total = questions.length;

  const stats = useMemo(() => {
    if (!activeSection) return { done: 0, total: 0 };
    if (!mounted) return { done: 0, total };
    return computeSectionStats(
      store,
      activeSection.topic,
      activeSection.file,
      total,
    );
  }, [store, mounted, activeSection, total]);

  const allDone = mounted && stats.done === stats.total && stats.total > 0;

  // One toggle rather than a Select all / Unselect all pair: whichever of the
  // two is available is always the opposite of the section's current state.
  return (
    <>
      <button
        type="button"
        className={`action-chip ${allDone ? 'active' : ''}`}
        onClick={() => setConfirm(allDone ? 'unselect' : 'select')}
        disabled={total === 0}
        title={allDone ? 'Clear progress on this subtopic' : 'Mark every question done'}
      >
        {allDone ? <Icon.Check /> : <Icon.Circle />} All done
      </button>
      <BulkConfirmDialog confirm={confirm} onCancel={() => setConfirm(null)} />
    </>
  );
};
