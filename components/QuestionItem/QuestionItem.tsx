'use client';

import React from 'react';
import type { PriorityLevel } from '@/lib/offlineSync';
import { Icon } from './icons';

interface Props {
  id: string;
  // Raw HTML (question titles carry inline formatting from the source
  // markdown) — rendered via dangerouslySetInnerHTML, same as before.
  title: string;
  isDone: boolean;
  isOpen: boolean;
  priority?: PriorityLevel | null;
  reorderable?: boolean;
  onToggleOpen: () => void;
  onToggleDone: () => void;
  onHandlePointerDown?: (e: React.PointerEvent) => void;
  // Rendered under the title (e.g. <QuestionCrumb /> for cross-section lists).
  subtitle?: React.ReactNode;
  // Rendered in the row's action slot (e.g. <StarButton /> + <RowActions />)
  // — callers compose whatever actions make sense for their view instead of
  // this component knowing about star/edit/move/delete/priority itself.
  actions?: React.ReactNode;
  // The expanded answer body (e.g. <QuestionAnswerBody q={q} />) — only
  // mounted once isOpen is true, same as before, but supplied by the caller
  // instead of this component knowing about question/answer content at all.
  children?: React.ReactNode;
}

export default function QuestionItem({
  id,
  title,
  isDone,
  isOpen,
  priority,
  reorderable,
  onToggleOpen,
  onToggleDone,
  onHandlePointerDown,
  subtitle,
  actions,
  children,
}: Props) {
  return (
    <div
      className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''} ${priority ? `pri-${priority}` : ''} ${reorderable ? 'reorderable' : ''}`}
      data-qid={id}
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
        {subtitle ? (
          <div className="q-body-col">
            <span
              className="q-text"
              dangerouslySetInnerHTML={{ __html: title }}
            />
            {subtitle}
          </div>
        ) : (
          <span
            className="q-text"
            dangerouslySetInnerHTML={{ __html: title }}
          />
        )}
        {actions && <div className="q-actions">{actions}</div>}
      </div>
      {isOpen && children}
    </div>
  );
}
