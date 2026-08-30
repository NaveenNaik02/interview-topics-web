'use client';

import {
  useEffect,
  useLayoutEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import type { ParsedQuestion } from '@/lib/parser';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { SectionMeta } from '@/lib/topics';
import type { PriorityFilterKey, StatusFilter } from '../store/types';
import { computePriorityStats } from '@/lib/stores/progressSelectors';

// Membership half of `processed`, split out so the delete toolbar's
// "select all" covers exactly the rows the list is showing.
export function isVisible(
  q: ParsedQuestion,
  filterSet: Set<PriorityFilterKey>,
  statusFilter: StatusFilter,
  isComplete: (id: string) => boolean,
) {
  if (filterSet.size && !filterSet.has(q.priority ?? 'none')) return false;
  if (statusFilter === 'done') return isComplete(q.id);
  if (statusFilter === 'notdone') return !isComplete(q.id);
  return true;
}

export interface ProcessedQuestion {
  q: ParsedQuestion;
  origIdx: number;
  priority: PriorityLevel | null;
}

/**
 * Derived filter/sort list and status selectors for one section view.
 * All state now lives in the global store under sectionQuestionsSlice.
 */
export function useSectionFilters(
  section: SectionMeta,
  questions: ParsedQuestion[],
  initialOrder: Record<string, number>,
) {
  const {
    mounted,
    store,
    orderStore,
    filterSet,
    statusFilter,
    sortMode,
    setSortMode,
  } = useAppStore(
    useShallow((s) => ({
      mounted: s.mounted,
      store: s.store,
      orderStore: s.orderStore,
      filterSet: s.filterSet,
      statusFilter: s.statusFilter,
      sortMode: s.sortMode,
      setSortMode: s.setSortMode,
    })),
  );
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const defaultSort = useAppStore((s) => s.defaultSort);

  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted],
  );

  const getOrderPosition = useCallback(
    (id: string) => (mounted ? (orderStore[id] ?? null) : null),
    [orderStore, mounted],
  );

  // Apply defaultSort once DB settings have loaded
  const sortAppliedRef = useRef(false);
  useEffect(() => {
    if (settingsLoaded && !sortAppliedRef.current) {
      sortAppliedRef.current = true;
      setSortMode(defaultSort);
    }
  }, [settingsLoaded, defaultSort, setSortMode]);

  // Priority now lives on the question row itself (see ParsedQuestion),
  // fetched with the rest of the section — no need to wait on a global
  // store fetch, so this is available (and correct) on first paint.
  const priCounts = useMemo(() => {
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
  }, [questions, section.topic, section.file]);

  const processed = useMemo<ProcessedQuestion[]>(() => {
    let list = questions.map((q, i) => ({
      q,
      origIdx: i,
      priority: q.priority ?? null,
    }));
    list = list.filter((x) => isVisible(x.q, filterSet, statusFilter, isComplete));
    if (sortMode === 'manual') {
      // Dragged questions get an explicit position; anything never dragged
      // (or added since the user's last reorder) keeps its original
      // number-order, appended after every positioned question.
      list = [...list].sort((a, b) => {
        const pa = getOrderPosition(a.q.id) ?? initialOrder[a.q.id] ?? null;
        const pb = getOrderPosition(b.q.id) ?? initialOrder[b.q.id] ?? null;
        if (pa != null && pb != null) return pa - pb;
        if (pa != null) return -1;
        if (pb != null) return 1;
        return a.origIdx - b.origIdx;
      });
    } else {
      const RANK: Record<string, number> = { high: 3, med: 2, low: 1 };
      list = [...list].sort((a, b) => {
        const ar = RANK[a.priority ?? ''] || 0;
        const br = RANK[b.priority ?? ''] || 0;
        if ((ar === 0) !== (br === 0)) return ar === 0 ? 1 : -1;
        if (ar !== br) return sortMode === 'high' ? br - ar : ar - br;
        return a.origIdx - b.origIdx;
      });
    }
    return list;
  }, [
    questions,
    filterSet,
    statusFilter,
    sortMode,
    isComplete,
    getOrderPosition,
    initialOrder,
  ]);

  // Drag-to-reorder is only meaningful in manual mode with nothing filtered
  // out — otherwise the visible list isn't "the whole section in one order".
  const reorderable =
    sortMode === 'manual' && filterSet.size === 0 && statusFilter === null;

  // Changing a question's priority can move it elsewhere in the sorted/filtered
  // list — that's expected. What shouldn't happen is the viewport following it
  // there: the user is reading wherever they currently are and wants to keep
  // reading from that same spot, not get dragged to the question's new slot.
  // So pin the raw window scroll offset across the reorder instead of trying
  // to keep any particular row in view. Callers call pinScroll() right before
  // the mutation that reshuffles the list.
  const savedScrollYRef = useRef<number | null>(null);
  const pinScroll = useCallback(() => {
    savedScrollYRef.current = window.scrollY;
  }, []);

  useLayoutEffect(() => {
    if (savedScrollYRef.current === null) return;
    window.scrollTo(0, savedScrollYRef.current);
    savedScrollYRef.current = null;
  }, [processed]);

  return {
    processed,
    priCounts,
    reorderable,
    pinScroll,
  };
}
