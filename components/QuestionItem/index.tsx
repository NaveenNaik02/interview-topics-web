'use client';

import React from 'react';
import Link from 'next/link';
import type { ParsedQuestion } from '@/lib/parser';
import type { PriorityLevel } from '@/lib/offlineSync';
import { Star } from 'lucide-react';
import RowActions from '../RowActions';
import { Icon } from './icons';
import { stripHtml } from './stripHtml';
import { QuestionAnswerBody } from './QuestionAnswerBody';

interface QuestionCrumb {
  topicLabel: string;
  subLabel: string;
  href: string;
}

interface Props {
  q: ParsedQuestion;
  isDone: boolean;
  isOpen: boolean;
  priority: PriorityLevel | null;
  onToggleOpen: () => void;
  onToggleDone: () => void;
  onSetPriority: (level: PriorityLevel | null) => void;
  crumb?: QuestionCrumb;
  onEdit?: () => void;
  onMove?: () => void;
  onSetAside?: () => void;
  onDelete?: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
  reorderable?: boolean;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
}

export default function QuestionItem({
  q,
  isDone,
  isOpen,
  priority,
  onToggleOpen,
  onToggleDone,
  onSetPriority,
  crumb,
  onEdit,
  onMove,
  onSetAside,
  onDelete,
  isStarred,
  onToggleStar,
  reorderable,
  onHandlePointerDown,
}: Props) {
  return (
    <div
      className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''} ${priority ? `pri-${priority}` : ''} ${reorderable ? 'reorderable' : ''}`}
      data-qid={q.id}
    >
      <div
        className="q-head"
        role="button"
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggleOpen();
          }
        }}
        aria-expanded={isOpen}
        {...(reorderable ? { onPointerDown: onHandlePointerDown } : {})}
      >
        <div className="q-check-col">
          <button
            className={`q-check ${isDone ? 'checked' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleDone();
            }}
            aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
            aria-pressed={isDone}
          >
            <Icon.Check />
          </button>
        </div>
        {crumb ? (
          <div className="q-body-col">
            <span
              className="q-text"
              dangerouslySetInnerHTML={{ __html: q.title }}
            />
            <Link
              href={crumb.href}
              className="q-crumb"
              onClick={(e) => e.stopPropagation()}
              title={`Go to ${crumb.topicLabel} › ${crumb.subLabel}`}
            >
              <b>{crumb.topicLabel}</b>
              <Icon.ChevronRight />
              {crumb.subLabel}
            </Link>
          </div>
        ) : (
          <span
            className="q-text"
            dangerouslySetInnerHTML={{ __html: q.title }}
          />
        )}
        <div className="q-actions">
          {onToggleStar && (
            <button
              className={`q-star ${isStarred ? 'on' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                onToggleStar();
              }}
              aria-label={
                isStarred ? 'Unstar question' : 'Star for pre-interview review'
              }
              aria-pressed={isStarred}
              title={
                isStarred
                  ? 'Starred — quick pre-interview review'
                  : 'Star for pre-interview review'
              }
            >
              <Star fill={isStarred ? 'currentColor' : 'none'} />
            </button>
          )}
          <RowActions
            getText={() => stripHtml(q.title)}
            onEdit={onEdit}
            onMove={onMove}
            onSetAside={onSetAside}
            onDelete={onDelete}
            isStarred={isStarred}
            onToggleStar={onToggleStar}
            priority={priority}
            onSetPriority={onSetPriority}
          />
        </div>
      </div>
      {isOpen && <QuestionAnswerBody q={q} />}
    </div>
  );
}
