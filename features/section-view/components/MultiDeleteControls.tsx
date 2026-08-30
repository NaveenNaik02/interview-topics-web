'use client';

import { useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { canManage } from '../canManage';
import { isVisible } from '../hooks/useSectionFilters';
import type { ParsedQuestion } from '@/lib/parser';
import { useDeleteToast } from '@/components/useDeleteToast';
import ConfirmDialog from '@/components/ConfirmDialog';
import * as Icon from '@/components/Icons';

// Multi-select delete for the section list: the chip flips the rows' check
// column into selection checkboxes (QuestionList/QuestionItem), and this is
// where the resulting set is deleted in one server round-trip.
const EMPTY_ARRAY: ParsedQuestion[] = [];

export const MultiDeleteControls = () => {
  const pathname = usePathname();
  const {
    selectMode,
    selectedIds,
    toggleSelectMode,
    clearSelection,
    setSelected,
    questions,
    filterSet,
    statusFilter,
    store,
    mounted,
    user,
  } = useAppStore(
    useShallow((s) => ({
      selectMode: s.selectMode,
      selectedIds: s.selectedIds,
      toggleSelectMode: s.toggleSelectMode,
      clearSelection: s.clearSelection,
      setSelected: s.setSelected,
      questions: s.sectionQuestionsCache[pathname] || EMPTY_ARRAY,
      filterSet: s.filterSet,
      statusFilter: s.statusFilter,
      store: s.store,
      mounted: s.mounted,
      user: s.user,
    })),
  );
  const { remove, toast } = useDeleteToast();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Everything the list is currently showing that this user may delete —
  // "select all" must not reach rows a filter is hiding.
  const selectable = useMemo(() => {
    const isComplete = (id: string) => mounted && !!store[id];
    return questions
      .filter(
        (q) =>
          canManage(q, user) && isVisible(q, filterSet, statusFilter, isComplete),
      )
      .map((q) => q.id);
  }, [questions, user, filterSet, statusFilter, store, mounted]);

  const count = selectedIds.size;
  const allSelected = count > 0 && count === selectable.length;

  const handleDelete = async () => {
    try {
      await remove([...selectedIds]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete');
      return;
    }
    setConfirming(false);
    clearSelection();
  };

  if (!selectMode) {
    return (
      <>
        <button
          type="button"
          className="action-chip"
          onClick={toggleSelectMode}
          title="Select several questions to delete"
        >
          <Trash2 /> Select
        </button>
        {toast}
      </>
    );
  }

  return (
    <>
      <button type="button" className="action-chip" onClick={clearSelection}>
        <Icon.Close /> Cancel
      </button>
      <button
        type="button"
        className="action-chip"
        onClick={() => setSelected(allSelected ? [] : selectable)}
        disabled={selectable.length === 0}
      >
        <span className={`q-check sel ${allSelected ? 'checked' : ''}`}>
          <Icon.Check />
        </span>
        Select all
      </button>
      <span className="action-chip active">{count} selected</span>
      <button
        type="button"
        className="action-chip danger"
        onClick={() => {
          setError(null);
          setConfirming(true);
        }}
        disabled={count === 0}
      >
        <Trash2 /> Delete {count > 0 && count}
      </button>
      <ConfirmDialog
        open={confirming}
        title={`Delete ${count} question${count === 1 ? '' : 's'}?`}
        message="They'll be removed from this subtopic. This can't be undone."
        confirmLabel="Delete"
        danger
        error={error}
        onConfirm={handleDelete}
        onCancel={() => setConfirming(false)}
      />
      {toast}
    </>
  );
};
