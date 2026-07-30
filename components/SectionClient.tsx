'use client'

import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { useTopicGroups } from '@/lib/TopicsContext'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'
import { sectionUrl, findGroupForSection, type SectionMeta, type TopicGroup } from '@/lib/topics'
import { getCachedQuestions } from '@/lib/offlineSync'
import { deleteQuestion } from '@/lib/actions/questions'
import { setAsideQuestion } from '@/lib/actions/setAside'
import QuestionItem from './QuestionItem'
import ConfirmDialog from './ConfirmDialog'
import FilterSortToolbar, { type PriorityFilterKey, type StatusFilter, type SortMode } from './FilterSortToolbar'
import AddQuestionModal, { type EditingQuestion } from './AddQuestionModal'
import MoveQuestionModal from './MoveQuestionModal'
import SaveToast from './SaveToast'
import { htmlToMarkdown } from '@/lib/htmlToMarkdown'

// Movement below this (px) counts as a click, not a drag — mirrors
// DRAG_THRESHOLD in lib/useFabDrag.ts.
const DRAG_THRESHOLD = 6

interface Props {
  section: SectionMeta
  group: TopicGroup
  questions: ParsedQuestion[]
}

export default function SectionClient({ section, group, questions: serverQuestions }: Props) {
  const { isComplete, toggle, setMany, sectionStats, setSectionTotal, mounted, isOnline, offlineModeEnabled, getPriority, setPriority, priorityStats, defaultSort, rememberFilters, settingsLoaded, navigateAfterMove, user, renameProgressId, renamePriorityId, renameStarId, appendSetAsideItem, isStarred, toggleStar, getOrderPosition, setQuestionOrder, renameOrderId } = useProgress()
  const groups = useTopicGroups()
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<'select' | 'unselect' | null>(null)
  const [questions, setQuestions] = useState<ParsedQuestion[]>(serverQuestions)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [moveToast, setMoveToast] = useState<string | null>(null)
  const [asideToast, setAsideToast] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null)
  const [movingQuestion, setMovingQuestion] = useState<{ id: string; label: string } | null>(null)

  // Filter/sort state
  const [filterSet, setFilterSet] = useState<Set<PriorityFilterKey>>(() => new Set())
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null)
  const [sortMode, setSortMode] = useState<SortMode>('manual')

  // Apply defaultSort once DB settings have loaded
  const sortAppliedRef = useRef(false)
  useEffect(() => {
    if (settingsLoaded && !sortAppliedRef.current) {
      sortAppliedRef.current = true
      setSortMode(defaultSort)
    }
  }, [settingsLoaded, defaultSort])

  // When navigating between sections: reset filters unless "remember filters" is on
  useEffect(() => {
    if (!rememberFilters) {
      setFilterSet(new Set())
      setStatusFilter(null)
      setSortMode(defaultSort)
    }
  }, [section.topic, section.file, rememberFilters, defaultSort])

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

  const priCounts = priorityStats(section.topic, section.file, questions.length)

  const processed = useMemo(() => {
    let list = questions.map((q, i) => ({ q, origIdx: i, priority: getPriority(q.id) }))
    if (filterSet.size) list = list.filter(x => filterSet.has(x.priority ?? 'none'))
    if (statusFilter === 'done') list = list.filter(x => isComplete(x.q.id))
    else if (statusFilter === 'notdone') list = list.filter(x => !isComplete(x.q.id))
    if (sortMode === 'manual') {
      // Dragged questions get an explicit position; anything never dragged
      // (or added since the user's last reorder) keeps its original
      // number-order, appended after every positioned question.
      list = [...list].sort((a, b) => {
        const pa = getOrderPosition(a.q.id)
        const pb = getOrderPosition(b.q.id)
        if (pa != null && pb != null) return pa - pb
        if (pa != null) return -1
        if (pb != null) return 1
        return a.origIdx - b.origIdx
      })
    } else {
      const RANK: Record<string, number> = { high: 3, med: 2, low: 1 }
      list = [...list].sort((a, b) => {
        const ar = RANK[a.priority ?? ''] || 0
        const br = RANK[b.priority ?? ''] || 0
        if ((ar === 0) !== (br === 0)) return ar === 0 ? 1 : -1
        if (ar !== br) return sortMode === 'high' ? br - ar : ar - br
        return a.origIdx - b.origIdx
      })
    }
    return list
  }, [questions, filterSet, statusFilter, sortMode, isComplete, getPriority, getOrderPosition])

  // Drag-to-reorder is only meaningful in manual mode with nothing filtered
  // out — otherwise the visible list isn't "the whole section in one order".
  const reorderable = sortMode === 'manual' && filterSet.size === 0 && statusFilter === null

  // Changing a question's priority can move it elsewhere in the sorted/filtered
  // list — that's expected. What shouldn't happen is the viewport following it
  // there: the user is reading wherever they currently are and wants to keep
  // reading from that same spot, not get dragged to the question's new slot.
  // So pin the raw window scroll offset across the reorder instead of trying
  // to keep any particular row in view.
  const savedScrollYRef = useRef<number | null>(null)

  const handleSetPriority = useCallback((id: string, level: PriorityLevel | null) => {
    savedScrollYRef.current = window.scrollY
    setPriority(id, level)
  }, [setPriority])

  useLayoutEffect(() => {
    if (savedScrollYRef.current === null) return
    window.scrollTo(0, savedScrollYRef.current)
    savedScrollYRef.current = null
  }, [processed])

  const togglePriorityFilter = useCallback((key: PriorityFilterKey) => {
    setFilterSet(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else if (key === 'none') {
        // "None" means no priority set — mutually exclusive with high/med/low.
        next.clear()
        next.add('none')
      } else {
        next.delete('none')
        next.add(key)
      }
      return next
    })
  }, [])

  const toggleStatusFilter = useCallback((v: 'done' | 'notdone') => {
    setStatusFilter(prev => (prev === v ? null : v))
  }, [])

  const clearFilters = useCallback(() => {
    setFilterSet(new Set())
    setStatusFilter(null)
  }, [])

  const handleSelectAll = useCallback(() => {
    setMany(ids, true)
    setConfirm(null)
  }, [ids, setMany])

  const handleUnselectAll = useCallback(() => {
    setMany(ids, false)
    setConfirm(null)
  }, [ids, setMany])

  const requestSelectAll = useCallback(() => {
    if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return }
    setConfirm('select')
  }, [isOnline, offlineModeEnabled])

  const requestUnselectAll = useCallback(() => {
    if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return }
    setConfirm('unselect')
  }, [isOnline, offlineModeEnabled])

  // Drag-to-reorder: native Pointer Events, no library. A floating shadow
  // clone of the dragged row tracks the pointer; the source row stays put.
  // Slot = nearest gap between the *other* (non-dragged) rows, found by
  // comparing the pointer's Y to each one's vertical midpoint.
  const listRef = useRef<HTMLDivElement>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [indicatorTop, setIndicatorTop] = useState<number | null>(null)
  const dragIdRef = useRef<string | null>(null)
  const activeSlotRef = useRef<number | null>(null)
  const dragOffsetRef = useRef({ x: 0, y: 0 })
  const shadowRef = useRef<HTMLElement | null>(null)

  const otherItemEls = useCallback(() => {
    if (!listRef.current) return [] as HTMLElement[]
    return [...listRef.current.querySelectorAll<HTMLElement>('.q-item')].filter(
      el => el.dataset.qid !== dragIdRef.current
    )
  }, [])

  const slotForY = useCallback((clientY: number) => {
    const items = otherItemEls()
    for (let i = 0; i < items.length; i++) {
      const r = items[i].getBoundingClientRect()
      if (clientY < r.top + r.height / 2) return i
    }
    return items.length
  }, [otherItemEls])

  const updateIndicator = useCallback((slot: number) => {
    const container = listRef.current
    if (!container) return
    const items = otherItemEls()
    const containerRect = container.getBoundingClientRect()
    let top: number
    if (items.length === 0) top = 0
    else if (slot <= 0) top = items[0].getBoundingClientRect().top - containerRect.top - 6
    else if (slot >= items.length) top = items[items.length - 1].getBoundingClientRect().bottom - containerRect.top + 6
    else {
      const rPrev = items[slot - 1].getBoundingClientRect()
      const rNext = items[slot].getBoundingClientRect()
      top = (rPrev.bottom + rNext.top) / 2 - containerRect.top
    }
    setIndicatorTop(top)
  }, [otherItemEls])

  // The handle now covers the whole row (not just the checkbox) so the
  // move-cursor affordance is easy to find on hover, but text/action clicks
  // must keep working normally — so nothing about the drag (shadow clone,
  // preventDefault, reorder) engages until the pointer has actually moved
  // past a small threshold. Mirrors the click-vs-drag pattern in useFabDrag.ts.
  const handlePointerDown = useCallback((id: string) => (e: React.PointerEvent) => {
    // Mouse-only: the cursor:move affordance this relies on doesn't exist on
    // touch anyway, and a touch drag gesture is indistinguishable from a
    // scroll swipe until it's too late — bailing here leaves scrolling
    // completely untouched (no listeners attached, no preventDefault).
    if (e.pointerType !== 'mouse') return
    const target = e.target as HTMLElement
    if (target.closest('.q-actions, .q-text, .q-body-col')) return
    if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return }
    const itemEl = (e.currentTarget as HTMLElement).closest<HTMLElement>('.q-item')
    if (!itemEl) return
    e.preventDefault() // avoid text-selection drag if this turns into a real reorder

    const startX = e.clientX
    const startY = e.clientY
    let shadow: HTMLElement | null = null
    let engaged = false

    const engage = () => {
      engaged = true
      const rect = itemEl.getBoundingClientRect()
      dragOffsetRef.current = { x: startX - rect.left, y: startY - rect.top }

      shadow = itemEl.cloneNode(true) as HTMLElement
      shadow.className = `drag-shadow ${itemEl.className}`
      shadow.style.width = `${rect.width}px`
      shadow.style.transform = `translate(${rect.left}px, ${rect.top}px)`
      document.body.appendChild(shadow)
      shadowRef.current = shadow

      const startSlot = processed.findIndex(({ q }) => q.id === id)
      dragIdRef.current = id
      activeSlotRef.current = startSlot
      setDragId(id)
      updateIndicator(startSlot)
    }

    const onPointerMove = (ev: PointerEvent) => {
      if (!engaged) {
        if (Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD) return
        engage()
      }
      const { x, y } = dragOffsetRef.current
      shadow!.style.transform = `translate(${ev.clientX - x}px, ${ev.clientY - y}px)`
      const slot = slotForY(ev.clientY)
      if (slot !== activeSlotRef.current) {
        activeSlotRef.current = slot
        updateIndicator(slot)
      }
    }
    const onPointerUp = () => {
      document.removeEventListener('pointermove', onPointerMove)
      if (!engaged) return
      const finalId = dragIdRef.current
      const finalSlot = activeSlotRef.current
      if (finalId != null && finalSlot != null) {
        const others = processed.map(({ q }) => q.id).filter(qid => qid !== finalId)
        others.splice(finalSlot, 0, finalId)
        setQuestionOrder(others)
      }
      if (shadowRef.current) { shadowRef.current.remove(); shadowRef.current = null }
      dragIdRef.current = null
      activeSlotRef.current = null
      setDragId(null)
      setIndicatorTop(null)
    }
    document.addEventListener('pointermove', onPointerMove)
    document.addEventListener('pointerup', onPointerUp, { once: true })
  }, [isOnline, offlineModeEnabled, processed, slotForY, updateIndicator, setQuestionOrder])

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
        <FilterSortToolbar
          filterSet={filterSet}
          statusFilter={statusFilter}
          sortMode={sortMode}
          counts={priCounts}
          onTogglePriority={togglePriorityFilter}
          onToggleStatus={toggleStatusFilter}
          onSetSort={setSortMode}
          onClear={clearFilters}
          onSelectAll={requestSelectAll}
          onUnselectAll={requestUnselectAll}
          allDone={allDone}
          noneDone={noneDone}
        />
      </div>

      <div className="questions-list" ref={listRef}>
        {processed.length === 0 ? (
          <div className="filter-empty">
            No questions match this filter.{' '}
            <button type="button" className="link-btn" onClick={clearFilters}>Clear filter</button>
          </div>
        ) : processed.map(({ q, priority }) => {
          const canManage = mounted && !!user && (q.createdBy === user.id || user.app_metadata?.is_admin === true)
          return (
            <QuestionItem
              key={q.id}
              q={q}
              isDone={isComplete(q.id)}
              isOpen={openId === q.id}
              priority={priority}
              reorderable={reorderable}
              onHandlePointerDown={handlePointerDown(q.id)}
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
              onSetPriority={(level) => handleSetPriority(q.id, level)}
              isStarred={isStarred(q.id)}
              onToggleStar={() => toggleStar(q.id)}
              onEdit={canManage ? () => setEditingQuestion({
                id: q.id,
                title: q.title,
                // ETL-imported questions never had raw markdown persisted,
                // only the pre-rendered HTML — fall back to a best-effort
                // conversion so the edit form isn't blank.
                markdown: q.markdown || htmlToMarkdown(q.bodyHtml),
                section,
                priority,
                lang: q.lang,
                tags: q.tags,
                problem: q.problem,
              }) : undefined}
              onMove={canManage ? () => setMovingQuestion({ id: q.id, label: q.title }) : undefined}
              onSetAside={canManage ? async () => {
                const item = await setAsideQuestion(q.id)
                appendSetAsideItem(item)
                setAsideToast(true)
                setTimeout(() => setAsideToast(false), 3600)
                router.refresh()
              } : undefined}
              onDelete={canManage ? async () => {
                await deleteQuestion(q.id)
                router.refresh()
              } : undefined}
            />
          )
        })}
        {reorderable && dragId != null && indicatorTop != null && (
          <div className="drop-indicator" style={{ top: `${indicatorTop}px` }} />
        )}
      </div>

      {movingQuestion && (
        <MoveQuestionModal
          groups={groups}
          questionId={movingQuestion.id}
          label={movingQuestion.label}
          currentSection={section}
          onClose={() => setMovingQuestion(null)}
          onMoved={(destination, newId) => {
            const changedSection = destination.topic !== section.topic || destination.file !== section.file
            if (changedSection) {
              renameProgressId(movingQuestion.id, newId)
              renamePriorityId(movingQuestion.id, newId)
              renameStarId(movingQuestion.id, newId)
              renameOrderId(movingQuestion.id, newId)
            }
            setMovingQuestion(null)
            if (navigateAfterMove && changedSection) {
              router.push(sectionUrl(destination))
              // Router Cache can still serve a stale prefetch of the
              // destination even after the server action's revalidatePath —
              // force it to refetch instead of waiting on a manual reload.
              router.refresh()
            } else if (changedSection) {
              const destGroup = findGroupForSection(groups, destination)
              setMoveToast(`${destGroup?.groupName ?? ''} → ${destination.label}`)
              setTimeout(() => setMoveToast(null), 3600)
              router.refresh()
            } else {
              router.refresh()
            }
          }}
        />
      )}

      {moveToast && <SaveToast title="Moved" detail={moveToast} />}
      {asideToast && <SaveToast title="Set aside" detail="Find it in Inbox whenever you're ready." />}

      {editingQuestion && (
        <AddQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(question, newSection) => {
            const changedSection = newSection.topic !== section.topic || newSection.file !== section.file
            if (changedSection && editingQuestion) {
              renameProgressId(editingQuestion.id, question.id)
              renamePriorityId(editingQuestion.id, question.id)
              renameStarId(editingQuestion.id, question.id)
              renameOrderId(editingQuestion.id, question.id)
            }
            setEditingQuestion(null)
            if (navigateAfterMove && changedSection) {
              router.push(sectionUrl(newSection))
              // Router Cache can still serve a stale prefetch of the
              // destination even after the server action's revalidatePath —
              // force it to refetch instead of waiting on a manual reload.
              router.refresh()
            } else if (changedSection) {
              const destGroup = findGroupForSection(groups, newSection)
              setMoveToast(`${destGroup?.groupName ?? ''} → ${newSection.label}`)
              setTimeout(() => setMoveToast(null), 3600)
              router.refresh()
            } else {
              router.refresh()
            }
          }}
        />
      )}

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
              <Send size={22} />
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
