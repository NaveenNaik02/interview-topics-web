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
import type { ShortlistRowData } from './buildRows';
import type { ShortlistFlag } from '@/lib/db/shortlist';

interface ShortlistRowProps {
  row: ShortlistRowData;
  flag: ShortlistFlag;
  isOpen: boolean;
  index: number;
  onToggleOpen: (id: string) => void;
  onUnflag: (id: string) => void;
  onSetPriority: (id: string, level: PriorityLevel | null) => void;
  onEdit: (row: ShortlistRowData) => void;
  onMove: (row: ShortlistRowData) => void;
  onSetAside: (row: ShortlistRowData) => void;
  onDelete: (id: string) => void;
}

const ShortlistRow = memo(function ShortlistRow({
  row,
  flag,
  isOpen,
  index,
  onToggleOpen,
  onUnflag,
  onSetPriority,
  onEdit,
  onMove,
  onSetAside,
  onDelete,
}: ShortlistRowProps) {
  const { q, subKey, topicLabel, canManage } = row;
  const isStarred = flag === 'starred';

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
            {isStarred && (
              <StarButton isStarred onToggle={() => onUnflag(q.id)} />
            )}
            <RowActions
              getText={() => stripHtml(q.title)}
              isStarred={isStarred}
              onToggleStar={isStarred ? () => onUnflag(q.id) : undefined}
              isGreyZone={!isStarred}
              onToggleGreyZone={isStarred ? undefined : () => onUnflag(q.id)}
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

export default ShortlistRow;
