'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TopicGroup, sectionUrl } from '@/lib/topics'
import { useProgress } from '@/lib/ProgressContext'
import { useUI } from '@/lib/UIContext'
import ConfirmDialog from './ConfirmDialog'

const Icon = {
  Chevron: () => (
    <svg className="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 7l6-5 6 5v6.5a1 1 0 0 1-1 1h-2.5v-4h-5v4H3a1 1 0 0 1-1-1V7z" />
    </svg>
  ),
  Check: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="4" y1="4" x2="12" y2="12" />
      <line x1="12" y1="4" x2="4" y2="12" />
    </svg>
  ),
  Gear: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6.6 2.2h2.8l.4 1.7c.45.15.87.36 1.25.62l1.6-.7 1.98 1.98-.7 1.6c.26.38.47.8.62 1.25l1.7.4v2.8l-1.7.4a4.9 4.9 0 0 1-.62 1.25l.7 1.6-1.98 1.98-1.6-.7a4.9 4.9 0 0 1-1.25.62l-.4 1.7H6.6l-.4-1.7a4.9 4.9 0 0 1-1.25-.62l-1.6.7-1.98-1.98.7-1.6a4.9 4.9 0 0 1-.62-1.25l-1.7-.4V6.8l1.7-.4c.15-.45.36-.87.62-1.25l-.7-1.6L4.75 1.57l1.6.7c.38-.26.8-.47 1.25-.62l.4-1.7Z" />
      <circle cx="8" cy="8" r="2.1" />
    </svg>
  ),
  Filter: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4h12M4 8h8M6 12h4" />
    </svg>
  ),
}

export default function Sidebar({ groups, questionIds }: { groups: TopicGroup[]; questionIds: Record<string, string[]> }) {
  const pathname = usePathname()
  const { stats, resetAll, setMany } = useProgress()
  const { drawerOpen, setDrawerOpen } = useUI()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['javascript', 'react']))
  const [confirmReset, setConfirmReset] = useState(false)
  const [confirm, setConfirm] = useState<{ slug: string; action: 'select' | 'unselect' } | null>(null)

  const doneCount = stats.completed
  const totalCount = stats.total
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <>
      <div className={`scrim ${drawerOpen ? 'show' : ''}`} onClick={() => setDrawerOpen(false)} />
      <aside className={`sidebar ${drawerOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Link href="/" className="brand" onClick={() => setDrawerOpen(false)}>
            <div className="brand-mark">P</div>
            <div>
              <div className="brand-title">Prep Tracker</div>
              <div className="brand-sub">Interview Prep · {totalCount} Q's</div>
            </div>
          </Link>
        </div>

        <div className="sidebar-summary">
          <div className="label">Overall progress</div>
          <div className="stat">
            <span className="stat-num">{doneCount}</span>
            <span className="stat-of">of {totalCount} · {overallPct}%</span>
          </div>
          <div className="bar"><div className="bar-fill" style={{ width: `${overallPct}%` }} /></div>
          <button
            className="reset-all"
            onClick={() => setConfirmReset(true)}
            disabled={doneCount === 0}
          >
            Reset all progress
          </button>
        </div>

        <nav className="sidebar-nav">
          <Link
            href="/"
            className={`subtopic-row ${pathname === '/' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8 }}
          >
            <span style={{ display: 'inline-flex', color: 'var(--text-subtle)' }}><Icon.Home /></span>
            <span className="subtopic-name">Dashboard</span>
          </Link>

          <Link
            href="/priority-mix"
            className={`subtopic-row ${pathname === '/priority-mix' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8 }}
          >
            <span style={{ display: 'inline-flex', color: 'var(--text-subtle)' }}><Icon.Filter /></span>
            <span className="subtopic-name">Priority Mix</span>
          </Link>

          {groups.map((group) => {
            const isExp = expanded.has(group.slug)

            let groupDone = 0
            let groupTotal = 0
            group.sections.forEach(s => {
              const sStats = stats.bySection[sectionUrl(s)]
              if (sStats) {
                groupDone += sStats.completed
                groupTotal += sStats.total
              }
            })

            const allDone = groupTotal > 0 && groupDone === groupTotal
            const noneDone = groupDone === 0

            return (
              <div className="topic-group" key={group.slug}>
                <div className="topic-row-wrap">
                  <button
                    className="topic-row"
                    aria-expanded={isExp}
                    onClick={() => toggleExpanded(group.slug)}
                  >
                    <Icon.Chevron />
                    <span className="topic-name">{group.groupName}</span>
                    <span className="topic-progress">{groupDone}/{groupTotal}</span>
                  </button>
                  {groupTotal > 0 && (
                    <div className="topic-row-tools">
                      <button
                        className="tr-tool"
                        title={`Mark all of ${group.groupName} done`}
                        aria-label={`Mark all of ${group.groupName} done`}
                        disabled={allDone}
                        onClick={() => setConfirm({ slug: group.slug, action: 'select' })}
                      >
                        <Icon.Check />
                      </button>
                      <button
                        className="tr-tool"
                        title={`Clear all progress in ${group.groupName}`}
                        aria-label={`Clear all progress in ${group.groupName}`}
                        disabled={noneDone}
                        onClick={() => setConfirm({ slug: group.slug, action: 'unselect' })}
                      >
                        <Icon.Close />
                      </button>
                    </div>
                  )}
                </div>
                {isExp && (
                  <ul className="subtopic-list">
                    {group.sections.map((s) => {
                      const url = sectionUrl(s)
                      const isActive = pathname === url
                      const sStats = stats.bySection[url]
                      const done = sStats?.completed || 0
                      const total = sStats?.total || 0
                      const pct = total ? (done / total) * 100 : 0
                      const complete = total > 0 && done === total
                      const hasQuestions = total > 0

                      return (
                        <li key={url}>
                          <Link
                            href={url}
                            className={`subtopic-row ${isActive ? 'active' : ''}`}
                            onClick={() => setDrawerOpen(false)}
                          >
                            <span
                              className={`progress-ring ${complete ? 'complete' : ''}`}
                              style={{ '--p': pct } as React.CSSProperties}
                            />
                            <span className="subtopic-name">{s.label}</span>
                            {!hasQuestions ? (
                              <span className="placeholder-tag">soon</span>
                            ) : (
                              <span className="topic-progress">{done}/{total}</span>
                            )}
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            )
          })}
        </nav>
      </aside>

      <ConfirmDialog
        open={confirmReset}
        danger
        requireText="RESET"
        title="Reset everything?"
        message={`This permanently clears progress on all ${doneCount} completed questions across every topic. This action cannot be undone.`}
        confirmLabel="Reset everything"
        onConfirm={() => { resetAll(); setConfirmReset(false) }}
        onCancel={() => setConfirmReset(false)}
      />
      <ConfirmDialog
        open={!!confirm && confirm.action === 'select'}
        title="Mark all as done?"
        message={confirm ? `This will mark all questions in "${groups.find(g => g.slug === confirm.slug)?.groupName}" as complete.` : ''}
        confirmLabel="Select all"
        onConfirm={() => { if (confirm) { setMany(questionIds[confirm.slug] ?? [], true) } setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirm && confirm.action === 'unselect'}
        title="Unselect all?"
        message={confirm ? `This will clear all progress in "${groups.find(g => g.slug === confirm.slug)?.groupName}". This can't be undone.` : ''}
        confirmLabel="Unselect all"
        onConfirm={() => { if (confirm) { setMany(questionIds[confirm.slug] ?? [], false) } setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    </>
  )
}
