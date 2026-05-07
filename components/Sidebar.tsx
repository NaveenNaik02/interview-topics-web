'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { TopicGroup, sectionUrl } from '@/lib/topics'
import { useProgress } from '@/lib/ProgressContext'
import { useUI } from '@/lib/UIContext'

const Icon = {
  Chevron: () => (
    <svg className="chev" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 4 10 8 6 12" />
    </svg>
  ),
  Home: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 7l6-5 6 5v6.5a1 1 0 0 1-1 1h-2.5v-4h-5v4H3a1 1 0 0 1-1-1V7z" />
    </svg>
  ),
}

export default function Sidebar({ groups }: { groups: TopicGroup[] }) {
  const pathname = usePathname()
  const { stats, isComplete } = useProgress()
  const { drawerOpen, setDrawerOpen } = useUI()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['javascript', 'react']))

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const doneCount = stats.completed
  const totalCount = stats.total
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

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

          {groups.map((group) => {
            const isExp = expanded.has(group.slug)
            
            // Calculate progress for this group
            let groupDone = 0
            let groupTotal = 0
            group.sections.forEach(s => {
              const sStats = stats.bySection[sectionUrl(s)]
              if (sStats) {
                groupDone += sStats.completed
                groupTotal += sStats.total
              }
            })

            return (
              <div className="topic-group-nav" key={group.slug}>
                <button
                  className="topic-row"
                  aria-expanded={isExp}
                  onClick={() => toggleExpanded(group.slug)}
                >
                  <Icon.Chevron />
                  <span className="topic-name">{group.groupName}</span>
                  <span className="topic-progress">{groupDone}/{groupTotal}</span>
                </button>
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

                      return (
                        <li key={url}>
                          <Link
                            href={url}
                            className={`subtopic-row ${isActive ? 'active' : ''}`}
                            onClick={() => setDrawerOpen(false)}
                          >
                            <span
                              className={`ring ${complete ? 'complete' : ''}`}
                              style={{ '--p': pct } as React.CSSProperties}
                            />
                            <span className="subtopic-name">{s.label}</span>
                            <span className="topic-progress">{done}/{total}</span>
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
    </>
  )
}
