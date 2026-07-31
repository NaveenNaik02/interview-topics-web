'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'
import { Star } from 'lucide-react'
import RowActions from './RowActions'

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
  ChevronRight: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 3l5 5-5 5" />
    </svg>
  ),
}

interface QuestionCrumb {
  topicLabel: string
  subLabel: string
  href: string
}

// Plain answer, or a Problem → Solution rail for implementation questions
// (q.problem set) — the code language badge is read off the rendered
// <code class="language-xxx"> the answer's fenced code block produces.
function QuestionAnswerBody({ q }: { q: ParsedQuestion }) {
  const ref = useRef<HTMLDivElement>(null)
  const [aCopied, copyAnswer] = useCopy()
  const [codeLang, setCodeLang] = useState('')

  useEffect(() => {
    if (!ref.current) return
    const codeEl = ref.current.querySelector('pre code[class*="language-"]')
    const m = codeEl?.className.match(/language-(\S+)/)
    setCodeLang(m ? m[1] : (q.lang && q.lang !== 'none' ? q.lang : ''))
  }, [q.id, q.bodyHtml, q.lang])

  // Runs after the codeLang state update above has committed (and re-rendered
  // the badge), so Prism's injected <span> tokens aren't the render that got
  // reset by that update — dangerouslySetInnerHTML gets reapplied on it.
  // Prism + its grammars are loaded on demand here rather than imported at
  // module scope, so pages with no open (or no code-containing) questions
  // never pay for them.
  useEffect(() => {
    let cancelled = false
    import('@/lib/highlight').then(({ highlightIn }) => {
      if (!cancelled) highlightIn(ref.current)
    })
    return () => { cancelled = true }
  }, [q.id, q.bodyHtml, codeLang])

  if (!q.problem) {
    return (
      <div className="q-body prose prose-slate dark:prose-invert max-w-none" ref={ref}>
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
    )
  }

  return (
    <div className="q-body" ref={ref}>
      <div className="q-rail">
        <div className="q-rail-item">
          <div className="q-rail-track"><span className="q-rail-dot" /><span className="q-rail-line" /></div>
          <div className="q-rail-content">
            <div className="q-rail-label">Problem</div>
            <p className="q-rail-problem-text">{q.problem}</p>
          </div>
        </div>
        <div className="q-rail-item">
          <div className="q-rail-track"><span className="q-rail-dot solid" /></div>
          <div className="q-rail-content">
            <div className="q-rail-label">Solution</div>
            <div className="q-code-card">
              <div className="q-code-head">
                <span className="q-code-lang">{codeLang || 'code'}</span>
                <button
                  className={`copy-btn q-code-copy ${aCopied ? 'copied' : ''}`}
                  onClick={(e) => copyAnswer(stripHtml(q.bodyHtml), e)}
                  aria-label="Copy solution"
                  title="Copy solution"
                >
                  {aCopied ? <Icon.Check /> : <Icon.Copy />}Copy
                </button>
              </div>
              <div className="q-body prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

interface Props {
  q: ParsedQuestion
  isDone: boolean
  isOpen: boolean
  priority: PriorityLevel | null
  onToggleOpen: () => void
  onToggleDone: () => void
  onSetPriority: (level: PriorityLevel | null) => void
  crumb?: QuestionCrumb
  onEdit?: () => void
  onMove?: () => void
  onSetAside?: () => void
  onDelete?: () => void
  isStarred?: boolean
  onToggleStar?: () => void
  reorderable?: boolean
  onHandlePointerDown?: (e: React.PointerEvent) => void
}

export default function QuestionItem({ q, isDone, isOpen, priority, onToggleOpen, onToggleDone, onSetPriority, crumb, onEdit, onMove, onSetAside, onDelete, isStarred, onToggleStar, reorderable, onHandlePointerDown }: Props) {
  return (
    <div className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''} ${priority ? `pri-${priority}` : ''} ${reorderable ? 'reorderable' : ''}`} data-qid={q.id}>
      <div
        className="q-head"
        role="button"
        tabIndex={0}
        onClick={onToggleOpen}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleOpen() } }}
        aria-expanded={isOpen}
        {...(reorderable ? { onPointerDown: onHandlePointerDown } : {})}
      >
        <div className="q-check-col">
          <button
            className={`q-check ${isDone ? 'checked' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleDone() }}
            aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
            aria-pressed={isDone}
          >
            <Icon.Check />
          </button>
        </div>
        {crumb ? (
          <div className="q-body-col">
            <span className="q-text" dangerouslySetInnerHTML={{ __html: q.title }} />
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
          <span className="q-text" dangerouslySetInnerHTML={{ __html: q.title }} />
        )}
        <div className="q-actions">
          {onToggleStar && (
            <button
              className={`q-star ${isStarred ? 'on' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleStar() }}
              aria-label={isStarred ? 'Unstar question' : 'Star for pre-interview review'}
              aria-pressed={isStarred}
              title={isStarred ? 'Starred — quick pre-interview review' : 'Star for pre-interview review'}
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
  )
}
