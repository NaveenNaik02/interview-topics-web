'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useProgress } from '@/lib/ProgressContext'
import { TopicGroup, sectionUrl } from '@/lib/topics'
import ConfirmDialog from './ConfirmDialog'

const Icon = {
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
}

interface Props {
  groups: TopicGroup[]
  questionIds: Record<string, string[]>
}

export default function DashboardClient({ groups, questionIds }: Props) {
  const router = useRouter()
  const { stats, mounted, setMany } = useProgress()
  const [confirm, setConfirm] = useState<{ slug: string; action: 'select' | 'unselect' } | null>(null)

  const doneCount = stats.completed
  const totalCount = stats.total
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  const handleConfirm = () => {
    if (!confirm) return
    const ids = questionIds[confirm.slug] ?? []
    setMany(ids, confirm.action === 'select')
    setConfirm(null)
  }

  return (
    <div className="dashboard-view">
      <header className="dash-hero">
        <div>
          <div className="dash-eyebrow">{today} · Curriculum</div>
          <h1 className="dash-title">Frontend interview prep, organized.</h1>
          <p className="dash-sub">A curated track across {totalCount} questions. Pick a topic, expand a question, mark it done. Your progress is saved in the cloud.</p>
        </div>
        <div className="overall-card">
          <div className="label">Overall</div>
          <div className="overall-row">
            <span className="overall-num">{mounted ? overallPct : 0}%</span>
            <span className="overall-of">{mounted ? doneCount : 0} / {totalCount}</span>
          </div>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${mounted ? overallPct : 0}%` }}
            />
          </div>
        </div>
      </header>

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
          const allDone = mounted && groupTotal > 0 && groupDone === groupTotal
          const noneDone = !mounted || groupDone === 0

          return (
            <div key={group.slug} className="topic-card">
              <button
                className="tc-main"
                onClick={() => router.push(sectionUrl(firstSection))}
              >
                <div className="tc-head">
                  <span className="tc-name">{group.groupName}</span>
                  <span className="tc-count">{groupTotal} Q</span>
                </div>
                <p className="tc-blurb">{group.blurb}</p>
                <div className="tc-progress">
                  <div className="bar">
                    <div
                      className="bar-fill"
                      style={{ width: `${mounted ? pct : 0}%` }}
                    />
                  </div>
                  <span>{mounted ? groupDone : 0}/{groupTotal}</span>
                </div>
              </button>
              <div className="tc-tools">
                <button
                  className="tc-tool"
                  disabled={allDone}
                  onClick={() => setConfirm({ slug: group.slug, action: 'select' })}
                >
                  <Icon.Check /><span>Select all</span>
                </button>
                <button
                  className="tc-tool"
                  disabled={noneDone}
                  onClick={() => setConfirm({ slug: group.slug, action: 'unselect' })}
                >
                  <Icon.Close /><span>Unselect all</span>
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!confirm && confirm.action === 'select'}
        title="Mark all as done?"
        message={confirm ? `This will mark all questions in "${groups.find(g => g.slug === confirm.slug)?.groupName}" as complete.` : ''}
        confirmLabel="Select all"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={!!confirm && confirm.action === 'unselect'}
        title="Unselect all?"
        message={confirm ? `This will clear all progress in "${groups.find(g => g.slug === confirm.slug)?.groupName}". This can't be undone.` : ''}
        confirmLabel="Unselect all"
        onConfirm={handleConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  )
}
