'use client';

import React, {
  useState,
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
import {
  type SectionMeta,
  type TopicGroup,
} from '@/lib/topics';
import { getCachedQuestions } from '@/lib/offlineSync';
import {
  setStarred,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';
import { computePriorityStats } from '@/lib/stores/progressSelectors';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  type PriorityFilterKey,
  type StatusFilter,
} from './components/FilterSortToolbar';
import type { SortMode } from '@/features/settings';
import OfflineModal from './components/OfflineModal';
import QuestionList from './components/QuestionList';
import SectionHeader from './components/SectionHeader';


interface Props {
  section: SectionMeta;
  group: TopicGroup;
  questions: ParsedQuestion[];
  initialOrder?: Record<string, number>;
}

export default function SectionClient({
  section,
  group,
  questions: serverQuestions,
  initialOrder = {},
}: Props) {
  const {
    setMany,
    setSectionTotal,
    mounted,
    isOnline,
    offlineModeEnabled,
    bumpStarredCount,
    store,
    orderStore,
  } = useAppStore(
    useShallow((s) => ({
      setMany: s.setMany,
      setSectionTotal: s.setSectionTotal,
      mounted: s.mounted,
      isOnline: s.isOnline,
      offlineModeEnabled: s.offlineModeEnabled,
      bumpStarredCount: s.bumpStarredCount,
      store: s.store,
      orderStore: s.orderStore,
    })),
  );

  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted],
  );

  const getOrderPosition = useCallback(
    (id: string) => (mounted ? (orderStore[id] ?? null) : null),
    [orderStore, mounted],
  );

  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const defaultSort = useAppStore((s) => s.defaultSort);
  const rememberFilters = useAppStore((s) => s.rememberFilters);
  const [confirm, setConfirm] = useState<'select' | 'unselect' | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>(serverQuestions);
  const [showOfflineModal, setShowOfflineModal] = useState(false);

  // Filter/sort state
  const [filterSet, setFilterSet] = useState<Set<PriorityFilterKey>>(
    () => new Set(),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [sortMode, setSortMode] = useState<SortMode>('manual');

  // Apply defaultSort once DB settings have loaded
  const sortAppliedRef = useRef(false);
  useEffect(() => {
    if (settingsLoaded && !sortAppliedRef.current) {
      sortAppliedRef.current = true;
      setSortMode(defaultSort);
    }
  }, [settingsLoaded, defaultSort]);

  // When navigating between sections: reset filters unless "remember filters" is on
  useEffect(() => {
    if (!rememberFilters) {
      setFilterSet(new Set());
      setStatusFilter(null);
      setSortMode(defaultSort);
    }
  }, [section.topic, section.file, rememberFilters, defaultSort]);

  // When offline and server returned empty questions, load from localStorage cache
  useEffect(() => {
    if (serverQuestions.length > 0) {
      setQuestions(serverQuestions);
      return;
    }
    if (offlineModeEnabled) {
      const cached = getCachedQuestions(section.topic, section.file);
      if (cached && cached.length > 0) setQuestions(cached as ParsedQuestion[]);
    }
  }, [
    serverQuestions,
    section.topic,
    section.file,
    offlineModeEnabled,
    isOnline,
  ]);

  useEffect(() => {
    const url = `/${section.topic}/${section.file}`;
    setSectionTotal(url, questions.length);
  }, [section, questions.length, setSectionTotal]);

  const ids = questions.map((q) => q.id);

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

  const processed = useMemo(() => {
    let list = questions.map((q, i) => ({
      q,
      origIdx: i,
      priority: q.priority ?? null,
    }));
    if (filterSet.size)
      list = list.filter((x) => filterSet.has(x.priority ?? 'none'));
    if (statusFilter === 'done') list = list.filter((x) => isComplete(x.q.id));
    else if (statusFilter === 'notdone')
      list = list.filter((x) => !isComplete(x.q.id));
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
  // to keep any particular row in view.
  const savedScrollYRef = useRef<number | null>(null);

  const handleSetPriority = useCallback(
    (id: string, level: PriorityLevel | null) => {
      savedScrollYRef.current = window.scrollY;
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, priority: level } : q)),
      );
      setPriorityAction(id, level).catch((err) =>
        console.error('[priority] write failed:', err),
      );
    },
    [],
  );

  const handleToggleStar = useCallback(
    (id: string, wasStarred: boolean) => {
      setQuestions((prev) =>
        prev.map((q) => (q.id === id ? { ...q, starred: !wasStarred } : q)),
      );
      bumpStarredCount(wasStarred ? -1 : 1);
      setStarred(id, !wasStarred).catch((err) =>
        console.error('[starred] write failed:', err),
      );
    },
    [bumpStarredCount],
  );

  useLayoutEffect(() => {
    if (savedScrollYRef.current === null) return;
    window.scrollTo(0, savedScrollYRef.current);
    savedScrollYRef.current = null;
  }, [processed]);

  const togglePriorityFilter = useCallback((key: PriorityFilterKey) => {
    setFilterSet((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else if (key === 'none') {
        // "None" means no priority set — mutually exclusive with high/med/low.
        next.clear();
        next.add('none');
      } else {
        next.delete('none');
        next.add(key);
      }
      return next;
    });
  }, []);

  const toggleStatusFilter = useCallback((v: 'done' | 'notdone') => {
    setStatusFilter((prev) => (prev === v ? null : v));
  }, []);

  const clearFilters = useCallback(() => {
    setFilterSet(new Set());
    setStatusFilter(null);
  }, []);

  const handleSelectAll = useCallback(() => {
    setMany(ids, true);
    setConfirm(null);
  }, [ids, setMany]);

  const handleUnselectAll = useCallback(() => {
    setMany(ids, false);
    setConfirm(null);
  }, [ids, setMany]);

  const requestSelectAll = useCallback(() => {
    if (!isOnline && !offlineModeEnabled) {
      setShowOfflineModal(true);
      return;
    }
    setConfirm('select');
  }, [isOnline, offlineModeEnabled]);

  const requestUnselectAll = useCallback(() => {
    if (!isOnline && !offlineModeEnabled) {
      setShowOfflineModal(true);
      return;
    }
    setConfirm('unselect');
  }, [isOnline, offlineModeEnabled]);


  return (
    <div className="content-wrapper">
      <SectionHeader
        group={group}
        section={section}
        total={questions.length}
        filterSet={filterSet}
        statusFilter={statusFilter}
        sortMode={sortMode}
        counts={priCounts}
        onTogglePriority={togglePriorityFilter}
        onToggleStatus={toggleStatusFilter}
        onSetSort={setSortMode}
        onClear={clearFilters}
        onSelectAll={requestSelectAll}
        onUnselectAll={requestUnselectAll}
      />

      <QuestionList
        processed={processed}
        clearFilters={clearFilters}
        isComplete={isComplete}
        reorderable={reorderable}
        setShowOfflineModal={setShowOfflineModal}
        handleToggleStar={handleToggleStar}
        handleSetPriority={handleSetPriority}
        section={section}
      />

      <ConfirmDialog
        open={confirm === 'select'}
        title="Mark all as done?"
        message={`This will mark all ${questions.length} questions in "${section.label}" as complete.`}
        confirmLabel="Select all"
        onConfirm={handleSelectAll}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'unselect'}
        title="Unselect all?"
        message={`This will clear progress on all ${questions.length} questions in "${section.label}". This can't be undone.`}
        confirmLabel="Unselect all"
        onConfirm={handleUnselectAll}
        onCancel={() => setConfirm(null)}
      />

      <OfflineModal
        open={showOfflineModal}
        onClose={() => setShowOfflineModal(false)}
      />
    </div>
  );
}
