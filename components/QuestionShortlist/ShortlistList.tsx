'use client';

import {
  useMemo,
  useState,
  useCallback,
  useOptimistic,
  useTransition,
} from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/stores/appStore';
import { useDeleteToast } from '@/components/useDeleteToast';
import { setPriority as setPriorityAction } from '@/lib/actions/questionFlags';
import type { ShortlistQuestion, ShortlistFlag } from '@/lib/db/shortlist';
import type { PriorityLevel } from '@/lib/offlineSync';
import SaveToast from '@/components/SaveToast';
import { buildRows, type ShortlistRowData } from './buildRows';
import ShortlistRow from './ShortlistRow';

export type { ShortlistRowData };

interface Props {
  questions: ShortlistQuestion[];
  flag: ShortlistFlag;
  onRemove: (id: string) => Promise<void>;
  onEdit: (row: ShortlistRowData) => void;
  onMove: (row: ShortlistRowData) => void;
  onSetAside: (row: ShortlistRowData) => void;
}

export default function ShortlistList({
  questions,
  flag,
  onRemove,
  onEdit,
  onMove,
  onSetAside,
}: Props) {
  const mounted = useAppStore((s) => s.mounted);
  const user = useAppStore((s) => s.user);

  const groups = useAppStore((s) => s.groups);
  const router = useRouter();
  const { remove, toast: deleteToast } = useDeleteToast();
  const [openId, setOpenId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticQuestions, setOptimisticQuestions] = useOptimistic(
    questions,
    (state, unflaggedId: string) => state.filter((q) => q.id !== unflaggedId),
  );

  const rows = useMemo(
    () => buildRows(optimisticQuestions, groups, mounted, user),
    [optimisticQuestions, groups, mounted, user],
  );

  const handleToggleOpen = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const unflag = useCallback(
    async (id: string) => {
      startTransition(async () => {
        setOptimisticQuestions(id);
        try {
          await onRemove(id);
          router.refresh();
        } catch (error) {
          console.error('Failed to remove question from list:', error);
          setErrorToast({
            title: 'Action failed',
            detail: 'Could not update the question. Reverting changes...',
          });
          setTimeout(() => {
            setErrorToast(null);
          }, 3600);
        }
      });
    },
    [onRemove, router, setOptimisticQuestions],
  );

  const handleSetPriority = useCallback(
    async (id: string, level: PriorityLevel | null) => {
      await setPriorityAction(id, level);
      router.refresh();
    },
    [router],
  );

  return (
    <div className="questions-list">
      {rows.map((row, index) => (
        <ShortlistRow
          key={row.q.id}
          row={row}
          flag={flag}
          isOpen={openId === row.q.id}
          index={index}
          onToggleOpen={handleToggleOpen}
          onUnflag={unflag}
          onSetPriority={handleSetPriority}
          onEdit={onEdit}
          onMove={onMove}
          onSetAside={onSetAside}
          onDelete={remove}
        />
      ))}
      {deleteToast}
      {errorToast && (
        <SaveToast
          title={errorToast.title}
          detail={errorToast.detail}
          variant="error"
        />
      )}
    </div>
  );
}
