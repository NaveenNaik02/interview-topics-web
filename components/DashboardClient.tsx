'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProgress } from '@/lib/context/ProgressContext'
import { TopicGroup, sectionUrl } from '@/lib/topics'
import { deleteTopicGroup } from '@/lib/actions/topics'
import ConfirmDialog from './ConfirmDialog'
import AddTopicModal from './AddTopicModal'

const Icon = {
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

interface Props {
  groups: TopicGroup[]
}

export default function DashboardClient({ groups }: Props) {
  const router = useRouter()
  const { stats, mounted, resetAll } = useProgress()
  const [addTarget, setAddTarget] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ slug: string; label: string } | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const doneCount = stats.completed
  const totalCount = stats.total
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteTopicGroup(deleteTarget.slug)
      setDeleteTarget(null)
      router.refresh()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Could not delete — try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="dashboard-view">
      <header className="dash-hero">
        <div>
          <div className="dash-eyebrow">{today} · Curriculum</div>
          <h1 className="dash-title">Frontend interview prep, organized.</h1>
          <p className="dash-sub">A curated track across {totalCount} questions. Pick a topic, expand a question, mark it done. Your progress is saved in the cloud.</p>
        </div>
      </header>

      <div className="overall-row-card">
        <div className="orc-stat">
          <div className="label">Overall progress</div>
          <div className="overall-row">
            <span className="overall-num">{mounted ? overallPct : 0}%</span>
            <span className="overall-of">{mounted ? doneCount : 0} of {totalCount} questions</span>
          </div>
        </div>
        <div className="bar orc-bar">
          <div
            className="bar-fill"
            style={{ width: `${mounted ? overallPct : 0}%` }}
          />
        </div>
        <button className="reset-all" onClick={() => setConfirmReset(true)} disabled={doneCount === 0}>
          Reset all progress
        </button>
      </div>

      <div className="dash-grid">
        {groups.map((group) => {
          let groupDone = 0
          let groupTotal = 0
          group.sections.forEach(s => {
            const sUrl = sectionUrl(s)
            const sStats = stats.bySection[sUrl]
            if (sStats) {
              groupDone += sStats.completed
              groupTotal += sStats.total
            }
          })

          const pct = groupTotal ? Math.round((groupDone / groupTotal) * 100) : 0
          const firstSection = group.sections[0]

          // A just-created topic (see AddTopicModal) has no subtopics yet —
          // nothing to navigate to, so render it as a static, non-clickable card.
          const tcMain = (
            <>
              <div className="tc-head">
                <span className="tc-name">{group.groupName}</span>
                <span className="tc-count">{groupTotal} Q</span>
              </div>
              <p className="tc-blurb">{group.blurb}</p>
              {firstSection ? (
                <div className="tc-progress">
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{ width: `${mounted ? pct : 0}%` }}
                    />
                  </div>
                  <span>{mounted ? groupDone : 0}/{groupTotal}</span>
                </div>
              ) : (
                <p className="tc-blurb" style={{ opacity: 0.7 }}>No subtopics yet</p>
              )}
            </>
          )

          return (
            <div key={group.slug} className="topic-card">
              {firstSection ? (
                <button
                  className="tc-main"
                  onClick={() => router.push(sectionUrl(firstSection))}
                >
                  {tcMain}
                </button>
              ) : (
                <div className="tc-main" style={{ cursor: 'default' }}>
                  {tcMain}
                </div>
              )}
              <div className="tc-tools">
                <button
                  className="tc-tool"
                  onClick={() => setAddTarget(group.slug)}
                >
                  <Icon.Plus /><span>Add subtopic</span>
                </button>
                {group.custom && (
                  <button
                    className="tc-tool"
                    onClick={() => { setDeleteError(null); setDeleteTarget({ slug: group.slug, label: group.groupName }) }}
                  >
                    <Icon.Trash /><span>Delete topic</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

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
        open={!!deleteTarget}
        danger
        title={deleteTarget ? `Delete "${deleteTarget.label}"?` : ''}
        message={deleteTarget ? `This permanently removes the "${deleteTarget.label}" topic. Topics with questions can't be deleted — remove its questions first.` : ''}
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
    </div>
  )
}
