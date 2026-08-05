'use client';

import { memo } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import type { PriorityLevel } from '@/lib/offlineSync';
import QuestionItem, {
  QuestionAnswerBody,
  QuestionCrumb,
  StarButton,
  stripHtml,
} from '@/components/QuestionItem';
import RowActions from '@/components/RowActions';
import type { StarredRow } from './starredRows';

interface StarredQuestionRowProps {
  row: StarredRow;
  isOpen: boolean;
  index: number;
  onToggleOpen: (id: string) => void;
  onUnstar: (id: string) => void;
  onSetPriority: (id: string, level: PriorityLevel | null) => void;
  onEdit: (row: StarredRow) => void;
  onMove: (row: StarredRow) => void;
  onSetAside: (row: StarredRow) => void;
  onDelete: (id: string) => void;
}

const StarredQuestionRow = memo(function StarredQuestionRow({
  row,
  isOpen,
  index,
  onToggleOpen,
  onUnstar,
  onSetPriority,
  onEdit,
  onMove,
  onSetAside,
  onDelete,
}: StarredQuestionRowProps) {
  const { q, subKey, topicLabel, canManage } = row;

  const isDone = useAppStore((s) => s.mounted && !!s.store[q.id]);
  const toggle = useAppStore((s) => s.toggle);

  return (
    <div className={index > 4 ? 'content-visibility-auto' : ''}>
      <QuestionItem
        id={q.id}
        title={q.title}
        isDone={isDone}
        isOpen={isOpen}
        priority={q.priority}
        onToggleOpen={() => onToggleOpen(q.id)}
        onToggleDone={() => toggle(q.id)}
        subtitle={
          <QuestionCrumb
            topicLabel={topicLabel}
            subLabel={q.label}
            href={subKey}
          />
        }
        actions={
          <>
            <StarButton isStarred onToggle={() => onUnstar(q.id)} />
            <RowActions
              getText={() => stripHtml(q.title)}
              isStarred
              onToggleStar={() => onUnstar(q.id)}
              priority={q.priority}
              onSetPriority={(level) => onSetPriority(q.id, level)}
              onEdit={canManage ? () => onEdit(row) : undefined}
              onMove={canManage ? () => onMove(row) : undefined}
              onSetAside={canManage ? () => onSetAside(row) : undefined}
              onDelete={canManage ? () => onDelete(q.id) : undefined}
            />
          </>
        }
      >
        <QuestionAnswerBody q={q} />
      </QuestionItem>
    </div>
  );
});

export default StarredQuestionRow;
