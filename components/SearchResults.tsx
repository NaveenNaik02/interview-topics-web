'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useProgress } from '@/lib/ProgressContext'
import { useUI } from '@/lib/UIContext'
import { supabase } from '@/lib/supabase/client'
import { TOPIC_GROUPS } from '@/lib/topics'

interface SearchQuestion {
  id: string
  title: string
  bodyHtml: string
  topic: string
  file: string
}

interface ResultItem {
  q: SearchQuestion
  groupName: string
  sectionLabel: string
  sectionUrl: string
  titleText: string
  bodyText: string
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

function escapeRe(str: string) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlight(text: string, query: string) {
  if (!query) return <>{text}</>
  const re = new RegExp(`(${escapeRe(query)})`, 'ig')
  const parts = text.split(re)
  return (
    <>
      {parts.map((part, i) =>
        re.test(part) ? <mark key={i}>{part}</mark> : <React.Fragment key={i}>{part}</React.Fragment>
      )}
    </>
  )
}

function snippet(text: string, query: string, len = 160): string {
  const lower = text.toLowerCase()
  const at = lower.indexOf(query.toLowerCase())
  if (at === -1) return text.slice(0, len) + (text.length > len ? '…' : '')
  const start = Math.max(0, at - 50)
  const end = Math.min(text.length, at + query.length + 110)
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '')
}

const SECTION_MAP: Record<string, { groupName: string; label: string }> = {}
for (const group of TOPIC_GROUPS) {
  for (const s of group.sections) {
    SECTION_MAP[`${s.topic}/${s.file}`] = { groupName: group.groupName, label: s.label }
  }
}

const ChevronDown = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="4 6 8 10 12 6" />
  </svg>
)

const Check = () => (
  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
  </svg>
)

export default function SearchResults() {
  const { query, setQuery } = useUI()
  const { isComplete, toggle } = useProgress()
  const router = useRouter()
  const [questions, setQuestions] = useState<SearchQuestion[]>([])
  const [loaded, setLoaded] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (loaded) return
    supabase
      .from('questions')
      .select('id, title, body_html, topic, file')
      .then(({ data }) => {
        if (data) {
          setQuestions(data.map(r => ({
            id: r.id,
            title: r.title,
            bodyHtml: r.body_html,
            topic: r.topic,
            file: r.file,
          })))
        }
        setLoaded(true)
      })
  }, [loaded])

  const trimmedQuery = query.trim()

  const results = useMemo<ResultItem[]>(() => {
    if (trimmedQuery.length < 2 || questions.length === 0) return []
    const ql = trimmedQuery.toLowerCase()
    const scored: { item: ResultItem; score: number }[] = []
    for (const q of questions) {
      const titleText = stripHtml(q.title)
      const bodyText = stripHtml(q.bodyHtml)
      const inTitle = titleText.toLowerCase().includes(ql)
      const inBody = bodyText.toLowerCase().includes(ql)
      if (!inTitle && !inBody) continue
      const key = `${q.topic}/${q.file}`
      const meta = SECTION_MAP[key] || { groupName: q.topic, label: q.file }
      scored.push({
        item: { q, groupName: meta.groupName, sectionLabel: meta.label, sectionUrl: `/${q.topic}/${q.file}`, titleText, bodyText },
        score: inTitle ? 0 : 1,
      })
    }
    scored.sort((a, b) => a.score - b.score)
    return scored.map(s => s.item)
  }, [trimmedQuery, questions])

  const goto = (url: string) => {
    setQuery('')
    router.push(url)
  }

  if (!loaded && trimmedQuery.length >= 2) {
    return (
      <div className="content-wrapper">
        <div className="subtopic-header">
          <div className="eyebrow">Search</div>
          <h1 className="subtopic-title">Searching…</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="content-wrapper">
      <div className="subtopic-header">
        <div className="eyebrow">Search</div>
        <h1 className="subtopic-title">
          {results.length} {results.length === 1 ? 'result' : 'results'}
        </h1>
        <div className="subtopic-meta">
          <span className="meta-stat">for <strong>&ldquo;{trimmedQuery}&rdquo;</strong></span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No matches</div>
          <p>Nothing matched &ldquo;{trimmedQuery}&rdquo;. Try a different keyword — search looks across every loaded question and answer.</p>
        </div>
      ) : (
        <div className="questions-list">
          {results.map(({ q, groupName, sectionLabel, sectionUrl, titleText, bodyText }) => {
            const isDone = isComplete(q.id)
            const isOpen = openId === q.id
            const inAnswer = !titleText.toLowerCase().includes(trimmedQuery.toLowerCase()) && bodyText.toLowerCase().includes(trimmedQuery.toLowerCase())
            return (
              <div className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''}`} key={q.id}>
                <div
                  className="q-head"
                  role="button"
                  tabIndex={0}
                  onClick={() => setOpenId(c => c === q.id ? null : q.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      setOpenId(c => c === q.id ? null : q.id)
                    }
                  }}
                >
                  <button
                    className={`q-check ${isDone ? 'checked' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggle(q.id) }}
                    aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
                    aria-pressed={isDone}
                  >
                    <Check />
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <button
                      className="result-crumb"
                      onClick={(e) => { e.stopPropagation(); goto(sectionUrl) }}
                    >
                      {groupName} <span className="crumb-sep">/</span> {sectionLabel}
                    </button>
                    <div className="q-text">{highlight(titleText, trimmedQuery)}</div>
                    {inAnswer && (
                      <div className="result-snippet">{highlight(snippet(bodyText, trimmedQuery), trimmedQuery)}</div>
                    )}
                  </div>
                  <span className="q-toggle"><ChevronDown /></span>
                </div>
                {isOpen && (
                  <div className="q-body prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: q.bodyHtml }} />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
