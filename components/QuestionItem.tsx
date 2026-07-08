'use client'

import React, { useState, useCallback } from 'react'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'
import PriorityPicker from './PriorityPicker'

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function useCopy() {
  const [copied, setCopied] = useState(false)
  const copy = useCallback((text: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const done = (ok: boolean) => {
      if (!ok) return
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    }
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => done(true)).catch(() => {
        fallbackCopy(text, done)
      })
    } else {
      fallbackCopy(text, done)
    }
  }, [])
  return [copied, copy] as const
}

function fallbackCopy(text: string, done: (ok: boolean) => void) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    done(true)
  } catch { done(false) }
}

const Icon = {
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  ),
  Copy: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.5" />
      <path d="M3.5 10.5h-.5a1 1 0 0 1-1-1v-6a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v.5" />
    </svg>
  ),
}

interface Props {
  q: ParsedQuestion
  idx: number
  isDone: boolean
  isOpen: boolean
  priority: PriorityLevel | null
  onToggleOpen: () => void
  onToggleDone: () => void
  onSetPriority: (level: PriorityLevel | null) => void
}

export default function QuestionItem({ q, idx, isDone, isOpen, priority, onToggleOpen, onToggleDone, onSetPriority }: Props) {
  const [qCopied, copyQuestion] = useCopy()
  const [aCopied, copyAnswer] = useCopy()

  return (
    <div className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''} ${priority ? `pri-${priority}` : ''}`}>
      <div
        className="q-head"
        role="button"
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleOpen() } }}
        aria-expanded={isOpen}
      >
        <button
          className={`q-check ${isDone ? 'checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggleDone() }}
          aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
          aria-pressed={isDone}
        >
          <Icon.Check />
        </button>
        <span className="q-num">{String(idx + 1).padStart(2, '0')}</span>
        <span className="q-text" dangerouslySetInnerHTML={{ __html: q.title }} />
        <button
          className={`copy-btn q-copy ${qCopied ? 'copied' : ''}`}
          onClick={(e) => copyQuestion(stripHtml(q.title), e)}
          aria-label="Copy question"
          title="Copy question"
        >
          {qCopied ? <Icon.Check /> : <Icon.Copy />}
        </button>
        <PriorityPicker value={priority} onChange={onSetPriority} />
      </div>
      {isOpen && (
        <div className="q-body prose prose-slate dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
          <div className="q-answer-foot">
            <button
              className={`copy-btn q-copy-answer ${aCopied ? 'copied' : ''}`}
              onClick={(e) => copyAnswer(stripHtml(q.bodyHtml), e)}
              aria-label="Copy answer"
              title="Copy answer"
            >
              {aCopied ? <Icon.Check /> : <Icon.Copy />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
