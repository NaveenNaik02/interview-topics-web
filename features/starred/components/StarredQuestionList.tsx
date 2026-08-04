'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/lib/context/ProgressContext';
import { useTopicGroups } from '@/lib/context/TopicsContext';
import { deleteQuestion } from '@/lib/actions/questions';
import {
  setStarred,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';
import type { StarredQuestion } from '@/features/starred/db';
import type { PriorityLevel } from '@/lib/offlineSync';
import QuestionItem from '@/components/QuestionItem';
import { buildStarredRows, type StarredRow } from './starredRows';

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
  // mounted/user/isComplete/toggle and groups are read straight from their
  // providers here rather than threaded down as props from StarredClient —
  // they're globally available, not something the parent owns.
  const { isComplete, toggle, mounted, user, bumpStarredCount } = useProgress();
  const groups = useTopicGroups();
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  const rows = useMemo(
    () => buildStarredRows(questions, groups, mounted, user),
    [questions, groups, mounted, user],
  );

  // These three are pure list-row actions — no dependency on any modal
  // state, which lives up in StarredClient (edit/move/set-aside do).
  const unstar = async (id: string) => {
    await setStarred(id, false);
    bumpStarredCount(-1);
    router.refresh();
  };

  const handleSetPriority = async (id: string, level: PriorityLevel | null) => {
    await setPriorityAction(id, level);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteQuestion(id);
    router.refresh();
  };

  return (
    <div className="questions-list">
      {rows.map((row) => {
        const { q, subKey, topicLabel, canManage } = row;
        return (
          <QuestionItem
            key={q.id}
            q={{
              id: q.id,
              number: q.number,
              title: q.title,
              bodyHtml: q.bodyHtml,
              problem: q.problem,
            }}
            isDone={isComplete(q.id)}
            isOpen={openId === q.id}
            priority={q.priority}
            onToggleOpen={() => setOpenId(openId === q.id ? null : q.id)}
            onToggleDone={() => toggle(q.id)}
            onSetPriority={(level) => handleSetPriority(q.id, level)}
            crumb={{ topicLabel, subLabel: q.label, href: subKey }}
            isStarred
            onToggleStar={() => unstar(q.id)}
            onEdit={canManage ? () => onEdit(row) : undefined}
            onMove={canManage ? () => onMove(row) : undefined}
            onSetAside={canManage ? () => onSetAside(row) : undefined}
            onDelete={canManage ? () => handleDelete(q.id) : undefined}
          />
        );
      })}
    </div>
  );
}
