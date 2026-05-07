'use client'

import React, { useState, useEffect } from 'react'
import { useProgress } from '@/lib/ProgressContext'
import type { ParsedQuestion } from '@/lib/parser'
import type { SectionMeta, TopicGroup } from '@/lib/topics'
import QuestionItem from './QuestionItem'

interface Props {
  section: SectionMeta
  group: TopicGroup
  questions: ParsedQuestion[]
}

export default function SectionClient({ section, group, questions }: Props) {
  const { isComplete, toggle, sectionStats, setSectionTotal, mounted } = useProgress()
  const [openId, setOpenId] = useState<string | null>(null)
  
  useEffect(() => {
    const url = `/${section.topic}/${section.file}`
    setSectionTotal(url, questions.length)
  }, [section, questions.length, setSectionTotal])

  const stats = sectionStats(section.topic, section.file, questions.length)
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0

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
      </div>

      <div className="questions-list">
        {questions.map((q, idx) => (
          <QuestionItem
            key={q.id}
            q={q}
            idx={idx}
            isDone={isComplete(q.id)}
            isOpen={openId === q.id}
            onToggleOpen={() => setOpenId(openId === q.id ? null : q.id)}
            onToggleDone={() => toggle(q.id)}
          />
        ))}
      </div>
    </div>
  )
}
