'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/lib/stores/appStore'
import { useSearch } from '@/lib/context/SearchContext'
import { supabase } from '@/lib/supabase/client'

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
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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
        re.test(part) ? (
          <mark key={i}>{part}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        ),
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
  return (
    (start > 0 ? '…' : '') +
    text.slice(start, end) +
    (end < text.length ? '…' : '')
  )
}

const ChevronDown = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="4 6 8 10 12 6" />
  </svg>
)

const Check = () => (
  <svg
    viewBox="0 0 16 16"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
  </svg>
)

export default function SearchResults() {
  const { query, setQuery } = useSearch()
  const toggle = useAppStore((s) => s.toggle)
  const store = useAppStore((s) => s.store)
  const mounted = useAppStore((s) => s.mounted)
  const isComplete = useCallback(
    (id: string) => mounted && !!store[id],
    [store, mounted]
  )
  const groups = useAppStore((s) => s.groups)
  const router = useRouter()
  // Kept with the query they belong to, so `loading` is derived rather than a
  // second state — a plain flag is false during the debounce, which renders the
  // previous query's rows as if they were this query's answer.
  const [fetched, setFetched] = useState<{
    query: string
    rows: SearchQuestion[]
  }>({ query: '', rows: [] })
  const [openId, setOpenId] = useState<string | null>(null)

  const trimmedQuery = query.trim()
  const questions = fetched.rows
  const loading = fetched.query !== trimmedQuery

  // Only matching rows cross the wire. Fetching the whole table to filter in the
  // browser cost ~685 kB a search and silently stopped at PostgREST's 1000-row
  // cap. ilike is a broad prefilter and `results` below re-applies the exact
  // substring match to whatever it sent, so the pattern only ever has to avoid
  // matching too *little* — every transform below widens it.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      // Quoted, since a query can contain commas or parens — reserved in a
      // PostgREST filter value.
      //
      // Two widenings, both because the filter runs on raw body_html while the
      // client filter runs on stripped text:
      //   & < >  are stored as entities, so `=>` has to reach a stored `=&gt;`
      //   spaces may be a newline or an inline tag — `the DOM` has to reach
      //          `the <strong>DOM</strong>`, which cost 7 of 25 matches
      //
      // ponytail: a query of only these characters widens to all-wildcard and
      // re-opens the max_rows ceiling this file exists to close. Harmless at
      // 575 rows; if the library passes ~1000, match on a stripped-text column
      // instead of widening.
      const like = trimmedQuery
        .replace(/[\\"]/g, '\\$&')
        .replace(/[&<>]/g, '%')
        .replace(/\s+/g, '%')
      const pattern = `"%${like}%"`
      supabase
        .from('questions')
        .select('id, title, body_html, topic, file')
        .or(`title.ilike.${pattern},body_html.ilike.${pattern}`)
        .then(({ data, error }) => {
          if (cancelled) return
          if (error) console.error('search:', error.message)
          setFetched({
            query: trimmedQuery,
            rows: (data ?? []).map((r) => ({
              id: r.id,
              title: r.title,
              bodyHtml: r.body_html,
              topic: r.topic,
              file: r.file,
            })),
          })
        })
    }, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [trimmedQuery])

  const sectionMap = useMemo(() => {
    const map: Record<string, { groupName: string; label: string }> = {}
    for (const group of groups) {
      for (const s of group.sections) {
        map[`${s.topic}/${s.file}`] = {
          groupName: group.groupName,
          label: s.label,
        }
      }
    }
    return map
  }, [groups])

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
      const meta = sectionMap[key] || { groupName: q.topic, label: q.file }
      scored.push({
        item: {
          q,
          groupName: meta.groupName,
          sectionLabel: meta.label,
          sectionUrl: `/${q.topic}/${q.file}`,
          titleText,
          bodyText,
        },
        score: inTitle ? 0 : 1,
      })
    }
    scored.sort((a, b) => a.score - b.score)
    return scored.map((s) => s.item)
  }, [trimmedQuery, questions, sectionMap])

  const goto = (url: string) => {
    setQuery('')
    router.push(url)
  }

  if (loading) {
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
          <span className="meta-stat">
            for <strong>&ldquo;{trimmedQuery}&rdquo;</strong>
          </span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="empty">
          <div className="empty-title">No matches</div>
          <p>
            Nothing matched &ldquo;{trimmedQuery}&rdquo;. Try a different
            keyword — search looks across every question and answer.
          </p>
        </div>
      ) : (
        <div className="questions-list">
          {results.map(
            ({
              q,
              groupName,
              sectionLabel,
              sectionUrl,
              titleText,
              bodyText,
            }) => {
              const isDone = isComplete(q.id)
              const isOpen = openId === q.id
              const inAnswer =
                !titleText.toLowerCase().includes(trimmedQuery.toLowerCase()) &&
                bodyText.toLowerCase().includes(trimmedQuery.toLowerCase())
              return (
                <div
                  className={`q-item ${isDone ? 'done' : ''} ${isOpen ? 'open' : ''}`}
                  key={q.id}
                >
                  <div
                    className="q-head"
                    role="button"
                    tabIndex={0}
                    onClick={() => setOpenId((c) => (c === q.id ? null : q.id))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setOpenId((c) => (c === q.id ? null : q.id))
                      }
                    }}
                  >
                    <button
                      className={`q-check ${isDone ? 'checked' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(q.id)
                      }}
                      aria-label={isDone ? 'Mark as not done' : 'Mark as done'}
                      aria-pressed={isDone}
                    >
                      <Check />
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <button
                        className="result-crumb"
                        onClick={(e) => {
                          e.stopPropagation()
                          goto(sectionUrl)
                        }}
                      >
                        {groupName} <span className="crumb-sep">/</span>{' '}
                        {sectionLabel}
                      </button>
                      <div className="q-text">
                        {highlight(titleText, trimmedQuery)}
                      </div>
                      {inAnswer && (
                        <div className="result-snippet">
                          {highlight(
                            snippet(bodyText, trimmedQuery),
                            trimmedQuery,
                          )}
                        </div>
                      )}
                    </div>
                    <span className="q-toggle">
                      <ChevronDown />
                    </span>
                  </div>
                  {isOpen && (
                    <div
                      className="q-body prose prose-slate dark:prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: q.bodyHtml }}
                    />
                  )}
                </div>
              )
            },
          )}
        </div>
      )}
    </div>
  )
}
