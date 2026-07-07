'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Plane } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import type { ParsedQuestion } from '@/lib/parser'
import type { SectionMeta, TopicGroup } from '@/lib/topics'
import { getCachedQuestions } from '@/lib/offlineSync'
import QuestionItem from './QuestionItem'
import ConfirmDialog from './ConfirmDialog'

interface Props {
  section: SectionMeta
  group: TopicGroup
  questions: ParsedQuestion[]
}

export default function SectionClient({ section, group, questions: serverQuestions }: Props) {
  const { isComplete, toggle, setMany, sectionStats, setSectionTotal, mounted, isOnline, offlineModeEnabled } = useProgress()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'select' | 'unselect' | null>(null)
  const [questions, setQuestions] = useState<ParsedQuestion[]>(serverQuestions)
  const [showOfflineModal, setShowOfflineModal] = useState(false)

  // When offline and server returned empty questions, load from localStorage cache
  useEffect(() => {
    if (serverQuestions.length > 0) {
      setQuestions(serverQuestions)
      return
    }
    if (offlineModeEnabled) {
      const cached = getCachedQuestions(section.topic, section.file)
      if (cached && cached.length > 0) setQuestions(cached as ParsedQuestion[])
    }
  }, [serverQuestions, section.topic, section.file, offlineModeEnabled, isOnline])

  useEffect(() => {
    const url = `/${section.topic}/${section.file}`
    setSectionTotal(url, questions.length)
  }, [section, questions.length, setSectionTotal])

  const stats = sectionStats(section.topic, section.file, questions.length)
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
  const allDone = mounted && stats.done === stats.total && stats.total > 0
  const noneDone = !mounted || stats.done === 0
  const ids = questions.map(q => q.id)

  const handleSelectAll = useCallback(() => {
    setMany(ids, true)
    setConfirm(null)
  }, [ids, setMany])

  const handleUnselectAll = useCallback(() => {
    setMany(ids, false)
    setConfirm(null)
  }, [ids, setMany])

  return (
    <div className="content-wrapper">
      <div className="subtopic-header">
        <div className="eyebrow">{group.groupName}</div>
        <h1 className="subtopic-title">{section.label}</h1>
        <div className="subtopic-meta">
          <span className="meta-stat">
            <strong>{mounted ? stats.done : 0}</strong> of <strong>{stats.total}</strong> complete
          </span>
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${mounted ? pct : 0}%` }}
            />
          </div>
          <span className="meta-stat" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {mounted ? pct : 0}%
          </span>
        </div>
        <div className="section-actions">
          <button
            className="btn btn-outline"
            onClick={() => {
              if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return }
              setConfirm('select')
            }}
            disabled={allDone}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
            </svg>
            Select all
          </button>
          <button
            className="btn btn-outline"
            onClick={() => {
              if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return }
              setConfirm('unselect')
            }}
            disabled={noneDone}
          >
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <line x1="4" y1="4" x2="12" y2="12" />
              <line x1="12" y1="4" x2="4" y2="12" />
            </svg>
            Unselect all
          </button>
        </div>
      </div>

      <div className="questions-list">
        {questions.map((q, idx) => (
          <QuestionItem
            key={q.id}
            q={q}
            idx={idx}
            isDone={isComplete(q.id)}
            isOpen={openId === q.id}
            onToggleOpen={() => {
              if (!isOnline && !offlineModeEnabled) {
                setShowOfflineModal(true)
                return
              }
              setOpenId(openId === q.id ? null : q.id)
            }}
            onToggleDone={() => {
              if (!isOnline && !offlineModeEnabled) {
                setShowOfflineModal(true)
                return
              }
              toggle(q.id)
            }}
          />
        ))}
      </div>

      <ConfirmDialog
        open={confirm === 'select'}
        title="Mark all as done?"
        message={`This will mark all ${questions.length} questions in "${section.label}" as complete.`}
        confirmLabel="Select all"
        onConfirm={handleSelectAll}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === 'unselect'}
        title="Unselect all?"
        message={`This will clear progress on all ${questions.length} questions in "${section.label}". This can't be undone.`}
        confirmLabel="Unselect all"
        onConfirm={handleUnselectAll}
        onCancel={() => setConfirm(null)}
      />

      {showOfflineModal && (
        <div className="confirm-overlay" onClick={() => setShowOfflineModal(false)}>
          <div className="confirm-dialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="offline-notavail-icon">
              <Plane size={22} />
            </div>
            <h2 className="confirm-title">Not available offline</h2>
            <p className="confirm-message">
              You&apos;re offline and haven&apos;t downloaded this content yet, so questions and answers can&apos;t be
              opened right now. Reconnect, or download an offline copy next time you&apos;re online to study anywhere.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowOfflineModal(false)}>Dismiss</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowOfflineModal(false)
                  document.dispatchEvent(new Event('open-offline-options'))
                }}
              >
                Offline options
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
