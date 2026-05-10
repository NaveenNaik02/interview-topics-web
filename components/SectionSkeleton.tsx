'use client'

import React from 'react'

export default function SectionSkeleton() {
  return (
    <div className="content-wrapper animate-pulse">
      <div className="subtopic-header">
        <div className="h-4 w-24 bg-[var(--bg-soft)] rounded eyebrow mb-2" />
        <div className="h-10 w-64 bg-[var(--bg-soft)] rounded mb-4" />
        <div className="subtopic-meta">
          <div className="h-4 w-32 bg-[var(--bg-soft)] rounded" />
          <div className="bar w-[200px] h-[6px] bg-[var(--bg-soft)]" />
          <div className="h-4 w-8 bg-[var(--bg-soft)] rounded" />
        </div>
      </div>

      <div className="questions-list">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="q-item">
            <div className="q-head">
              <div className="q-check border-[var(--border)] bg-[var(--bg-soft)]" />
              <div className="q-num bg-[var(--bg-soft)] h-3 w-4 rounded" />
              <div className="q-text h-5 bg-[var(--bg-soft)] rounded w-3/4" />
              <div className="q-toggle bg-[var(--bg-soft)] h-4 w-4 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
