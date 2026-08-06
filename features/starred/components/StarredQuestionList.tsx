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
import { useTopicGroups } from '@/lib/context/TopicsContext';
import { deleteQuestion } from '@/lib/actions/questions';
import {
  setStarred,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';
import type { StarredQuestion } from '@/features/starred/db/db';
import type { PriorityLevel } from '@/lib/offlineSync';
import SaveToast from '@/components/SaveToast';
import { buildStarredRows, type StarredRow } from './starredRows';
import StarredQuestionRow from './StarredQuestionRow';

export type { StarredRow };

interface Props {
  questions: StarredQuestion[];
  onEdit: (row: StarredRow) => void;
  onMove: (row: StarredRow) => void;
  onSetAside: (row: StarredRow) => void;
}

export default function StarredQuestionList({
  questions,
  onEdit,
  onMove,
  onSetAside,
}: Props) {
  const mounted = useAppStore((s) => s.mounted);
  const user = useAppStore((s) => s.user);
  const bumpStarredCount = useAppStore((s) => s.bumpStarredCount);

  const groups = useTopicGroups();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<{
    title: string;
    detail: string;
  } | null>(null);
  const [, startTransition] = useTransition();

  const [optimisticQuestions, setOptimisticQuestions] = useOptimistic(
    questions,
    (state, unstarId: string) => state.filter((q) => q.id !== unstarId),
  );

  const rows = useMemo(
    () => buildStarredRows(optimisticQuestions, groups, mounted, user),
    [optimisticQuestions, groups, mounted, user],
  );

  const handleToggleOpen = useCallback((id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  }, []);

  const unstar = useCallback(
    async (id: string) => {
      startTransition(async () => {
        setOptimisticQuestions(id);
        try {
          await setStarred(id, false);
          bumpStarredCount(-1);
          router.refresh();
        } catch (error) {
          console.error('Failed to unstar question:', error);
          setErrorToast({
            title: 'Action failed',
            detail: 'Failed to unstar the question. Reverting changes...',
          });
          setTimeout(() => {
            setErrorToast(null);
          }, 3600);
        }
      });
    },
    [bumpStarredCount, router, setOptimisticQuestions],
  );

  const handleSetPriority = useCallback(
    async (id: string, level: PriorityLevel | null) => {
      await setPriorityAction(id, level);
      router.refresh();
    },
    [router],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteQuestion(id);
      router.refresh();
    },
    [router],
  );

  return (
    <div className="questions-list">
      {rows.map((row, index) => (
        <StarredQuestionRow
          key={row.q.id}
          row={row}
          isOpen={openId === row.q.id}
          index={index}
          onToggleOpen={handleToggleOpen}
          onUnstar={unstar}
          onSetPriority={handleSetPriority}
          onEdit={onEdit}
          onMove={onMove}
          onSetAside={onSetAside}
          onDelete={handleDelete}
        />
      ))}
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
