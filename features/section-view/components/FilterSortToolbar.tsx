'use client'

import React, { useState, useRef, useEffect } from 'react'
import type { SortMode } from '@/features/settings'

export type PriorityFilterKey = 'high' | 'med' | 'low' | 'none'
export type StatusFilter = 'done' | 'notdone' | null

const PRI_MC: { k: PriorityFilterKey; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: 'none', label: 'None' },
]

const SORT_LABEL: Record<SortMode, string> = { manual: 'Manual', high: 'High first', low: 'Low first' }
const SORT_CYCLE: Record<SortMode, SortMode> = { manual: 'high', high: 'low', low: 'manual' }

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
  Filter: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 4h12M4 8h8M6 12h4" />
    </svg>
  ),
  Sort: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h10M5 8h6M7 12h2" />
    </svg>
  ),
  Circle: () => (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
    </svg>
  ),
}

function FilterMenu({
  counts, filterSet, statusFilter, onTogglePriority, onToggleStatus, onClear,
}: {
  counts: { high: number; med: number; low: number; none: number }
  filterSet: Set<PriorityFilterKey>
  statusFilter: StatusFilter
  onTogglePriority: (k: PriorityFilterKey) => void
  onToggleStatus: (v: 'done' | 'notdone') => void
  onClear: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const count = filterSet.size + (statusFilter ? 1 : 0)

  return (
    <div className="filter-menu" ref={ref}>
      <button
        type="button"
        className={`action-chip ${count ? 'active' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Icon.Filter />
        Filter {count > 0 && <span className="chip-badge">{count}</span>}
      </button>
      {open && (
        <div className="fpop" role="dialog" aria-label="Filter">
          <div className="fpop-sec">
            <div className="fpop-lab">Priority</div>
            <div className="mini-chips">
              {PRI_MC.map(({ k, label }) => (
                <button
                  key={k}
                  type="button"
                  className={`mc ${k} ${filterSet.has(k) ? 'on' : ''}`}
                  onClick={() => onTogglePriority(k)}
                >
                  <span className="mc-dot" />{label} <span className="mc-ct">{counts[k]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="fpop-sec">
            <div className="fpop-lab">Status</div>
            <div className="mini-chips">
              <button
                type="button"
                className={`mc done ${statusFilter === 'done' ? 'on' : ''}`}
                onClick={() => onToggleStatus('done')}
              >
                <Icon.Check />Done
              </button>
              <button
                type="button"
                className={`mc ${statusFilter === 'notdone' ? 'on' : ''}`}
                onClick={() => onToggleStatus('notdone')}
              >
                <Icon.Circle />Not done
              </button>
            </div>
          </div>
          <div className="fpop-foot">
            <button type="button" className="fpop-clear" onClick={onClear} disabled={!count}>Clear all</button>
            <button type="button" className="fpop-done" onClick={() => setOpen(false)}>Done</button>
          </div>
        </div>
      )}
    </div>
  )
}

interface Props {
  filterSet: Set<PriorityFilterKey>
  statusFilter: StatusFilter
  sortMode: SortMode
  counts: { high: number; med: number; low: number; none: number }
  onTogglePriority: (key: PriorityFilterKey) => void
  onToggleStatus: (v: 'done' | 'notdone') => void
  onSetSort: (mode: SortMode) => void
  onClear: () => void
  onSelectAll: () => void
  onUnselectAll: () => void
  allDone: boolean
  noneDone: boolean
}

export default function FilterSortToolbar({
  filterSet, statusFilter, sortMode, counts,
  onTogglePriority, onToggleStatus, onSetSort, onClear,
  onSelectAll, onUnselectAll, allDone, noneDone,
}: Props) {
  const hasFilters = filterSet.size > 0 || !!statusFilter

  const activeTokens: { key: string; cls: string; label: string; dot: boolean; remove: () => void }[] = []
  for (const { k, label } of PRI_MC) {
    if (filterSet.has(k)) activeTokens.push({ key: k, cls: k, label, dot: true, remove: () => onTogglePriority(k) })
  }
  if (statusFilter === 'done') activeTokens.push({ key: 'status', cls: 'done', label: 'Done', dot: false, remove: () => onToggleStatus('done') })
  else if (statusFilter === 'notdone') activeTokens.push({ key: 'status', cls: 'status', label: 'Not done', dot: false, remove: () => onToggleStatus('notdone') })

  return (
    <div className="section-toolbar">
      <button type="button" className="action-chip" onClick={onSelectAll} disabled={allDone}>
        <Icon.Check /> Select all
      </button>
      <button type="button" className="action-chip" onClick={onUnselectAll} disabled={noneDone}>
        <Icon.Close /> Unselect all
      </button>
      {hasFilters && <span className="tb-divider" />}
      <div className="tb-chips">
        {activeTokens.map(t => (
          <span key={t.key} className={`f-token ${t.cls}`}>
            {t.dot ? <span className="f-token-dot" /> : t.key === 'status' && statusFilter === 'done' ? <Icon.Check /> : <Icon.Circle />}
            {t.label}
            <button type="button" className="f-token-x" onClick={t.remove} aria-label={`Remove ${t.label} filter`}>
              <Icon.Close />
            </button>
          </span>
        ))}
        {hasFilters && <button type="button" className="f-clear-all" onClick={onClear}>Clear all</button>}
      </div>
      <FilterMenu
        counts={counts}
        filterSet={filterSet}
        statusFilter={statusFilter}
        onTogglePriority={onTogglePriority}
        onToggleStatus={onToggleStatus}
        onClear={onClear}
      />
      <button type="button" className="action-chip" onClick={() => onSetSort(SORT_CYCLE[sortMode])} title="Change sort order">
        <Icon.Sort />
        {SORT_LABEL[sortMode]}
      </button>
    </div>
  )
}
