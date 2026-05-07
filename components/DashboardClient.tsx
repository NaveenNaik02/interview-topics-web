'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { useProgress } from '@/lib/ProgressContext'
import { TopicGroup, SectionMeta, sectionUrl } from '@/lib/topics'

type SectionWithTotal = SectionMeta & { total: number }
type GroupWithTotals = Omit<TopicGroup, 'sections'> & { sections: SectionWithTotal[] }

export default function DashboardClient({ groups }: { groups: GroupWithTotals[] }) {
  const { stats, setSectionTotal, mounted } = useProgress()

  useEffect(() => {
    groups.forEach(group => {
      group.sections.forEach(section => {
        setSectionTotal(sectionUrl(section), section.total)
      })
    })
  }, [groups, setSectionTotal])

  const doneCount = stats.completed
  const totalCount = stats.total
  const overallPct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

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

          return (
            <Link 
              key={group.slug} 
              href={sectionUrl(firstSection)}
              className="topic-card"
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
            </Link>
          )
        })}
      </div>
    </div>
  )
}
