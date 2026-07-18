'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { TopicGroup, sectionUrl } from '@/lib/topics'
import { useProgress } from '@/lib/ProgressContext'
import { useUI } from '@/lib/UIContext'
import { deleteSection, deleteTopicGroup } from '@/lib/actions/topics'
import { Settings } from 'lucide-react'
import ConfirmDialog from './ConfirmDialog'
import AddTopicModal from './AddTopicModal'

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
  Gear: () => <Settings size={16} strokeWidth={1.7} aria-hidden="true" />,
  Filter: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4h12M4 8h8M6 12h4" />
    </svg>
  ),
  Inbox: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 8h3.2l1.1 2.4h3.4L10.8 8H14M2 8V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4M2 8v4a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" />
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="8" y1="3" x2="8" y2="13" />
      <line x1="3" y1="8" x2="13" y2="8" />
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4.5h10M6 4.5V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1.5M6.5 7.5v4M9.5 7.5v4M4 4.5l.6 8.1a1 1 0 0 0 1 .9h4.8a1 1 0 0 0 1-.9l.6-8.1" />
    </svg>
  ),
}

type DeleteTarget =
  | { kind: 'group'; slug: string; label: string }
  | { kind: 'section'; topic: string; file: string; label: string }

export default function Sidebar({ groups }: { groups: TopicGroup[] }) {
  const pathname = usePathname()
  const router = useRouter()
  const { stats, inboxItems } = useProgress()
  const { drawerOpen, setDrawerOpen } = useUI()
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['javascript', 'react']))
  const [addTarget, setAddTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const requestDelete = (target: DeleteTarget) => {
    setDeleteError(null)
    setDeleteTarget(target)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      if (deleteTarget.kind === 'group') await deleteTopicGroup(deleteTarget.slug)
      else await deleteSection(deleteTarget.topic, deleteTarget.file)
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete — try again.')
    } finally {
      setDeleting(false)
    }
  }

  const totalCount = stats.total

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
          <Link href="/" className="brand" onClick={() => setDrawerOpen(false)} prefetch={false}>
            <div className="brand-mark">P</div>
            <div>
              <div className="brand-title">Prep Tracker</div>
              <div className="brand-sub">Interview Prep · {totalCount} Q&apos;s</div>
            </div>
          </Link>
        </div>

        <nav className="sidebar-nav">
          <Link
            href="/"
            className={`subtopic-row ${pathname === '/' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8 }}
            prefetch={false}
          >
            <span style={{ display: 'inline-flex', color: 'var(--text-subtle)', width: 16, height: 16 }}><Icon.Home /></span>
            <span className="subtopic-name">Dashboard</span>
          </Link>

          <Link
            href="/inbox"
            className={`subtopic-row ${pathname === '/inbox' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8, justifyContent: 'space-between' }}
            prefetch={false}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', color: 'var(--text-subtle)', width: 16, height: 16 }}><Icon.Inbox /></span>
              <span className="subtopic-name">Inbox</span>
            </span>
            {inboxItems.length > 0 && <span className="ic-nav-badge">{inboxItems.length}</span>}
          </Link>

          <Link
            href="/priority-mix"
            className={`subtopic-row ${pathname === '/priority-mix' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8 }}
            prefetch={false}
          >
            <span style={{ display: 'inline-flex', color: 'var(--text-subtle)', width: 16, height: 16 }}><Icon.Filter /></span>
            <span className="subtopic-name">Priority Mix</span>
          </Link>

          <Link
            href="/settings"
            className={`subtopic-row ${pathname === '/settings' ? 'active' : ''}`}
            onClick={() => setDrawerOpen(false)}
            style={{ marginBottom: 8 }}
            prefetch={false}
          >
            <span style={{ display: 'inline-flex', color: 'var(--text-subtle)', width: 16, height: 16 }}><Icon.Gear /></span>
            <span className="subtopic-name">Settings</span>
          </Link>

          <div className="sidebar-nav-sep" />

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
                  <div className="topic-row-tools">
                    <button
                      className="tr-tool"
                      title={`Add subtopic to ${group.groupName}`}
                      aria-label={`Add subtopic to ${group.groupName}`}
                      onClick={() => setAddTarget(group.slug)}
                    >
                      <Icon.Plus />
                    </button>
                    {group.custom && (
                      <button
                        className="tr-tool"
                        title={`Delete ${group.groupName}`}
                        aria-label={`Delete ${group.groupName}`}
                        onClick={() => requestDelete({ kind: 'group', slug: group.slug, label: group.groupName })}
                      >
                        <Icon.Trash />
                      </button>
                    )}
                  </div>
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
                          <div className="subtopic-row-wrap">
                            <Link
                              href={url}
                              className={`subtopic-row ${isActive ? 'active' : ''}`}
                              onClick={() => setDrawerOpen(false)}
                              prefetch={false}
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
                            {s.custom && (
                              <div className="subtopic-tools">
                                <button
                                  type="button"
                                  className="tr-tool"
                                  title={`Delete ${s.label}`}
                                  aria-label={`Delete ${s.label}`}
                                  onClick={() => requestDelete({ kind: 'section', topic: s.topic, file: s.file, label: s.label })}
                                >
                                  <Icon.Trash />
                                </button>
                              </div>
                            )}
                          </div>
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
        open={!!deleteTarget}
        danger
        title={deleteTarget ? `Delete "${deleteTarget.label}"?` : ''}
        message={
          deleteTarget
            ? `This permanently removes the "${deleteTarget.label}" ${deleteTarget.kind === 'group' ? 'topic' : 'subtopic'}. ${deleteTarget.kind === 'group' ? 'Topics' : 'Subtopics'} with questions can't be deleted — remove its questions first.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {addTarget && (
        <AddTopicModal
          initialMode="subtopic"
          initialGroupSlug={addTarget}
          onClose={() => setAddTarget(null)}
          onSaved={() => { setAddTarget(null); router.refresh() }}
        />
      )}
    </>
  )
}
