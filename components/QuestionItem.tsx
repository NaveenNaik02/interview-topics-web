'use client'

import React from 'react'
import type { ParsedQuestion } from '@/lib/parser'

const Icon = {
  ChevronDown: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 6 8 10 12 6" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  ),
}

interface Props {
  q: ParsedQuestion
  idx: number
  isDone: boolean
  isOpen: boolean
  onToggleOpen: () => void
  onToggleDone: () => void
}

export default function QuestionItem({ q, idx, isDone, isOpen, onToggleOpen, onToggleDone }: Props) {
  return (
    <div className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''}`}>
      <div 
        className="q-head" 
        role="button" 
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={(e) => { 
          if (e.key === 'Enter' || e.key === ' ') { 
            e.preventDefault()
            onToggleOpen()
          } 
        }}
      >
        <button
          className={`q-check ${isDone ? 'checked' : ''}`}
          onClick={(e) => { 
            e.stopPropagation()
            onToggleDone()
          }}
          aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
          aria-pressed={isDone}
        >
          <Icon.Check />
        </button>
        <span className="q-num">{String(idx + 1).padStart(2, '0')}</span>
        <span className="q-text" dangerouslySetInnerHTML={{ __html: q.title }} />
        <span className="q-toggle"><Icon.ChevronDown /></span>
      </div>
      {isOpen && (
        <div 
          className="q-body prose prose-slate dark:prose-invert max-w-none" 
          dangerouslySetInnerHTML={{ __html: q.bodyHtml }} 
        />
      )}
    </div>
  )
}
