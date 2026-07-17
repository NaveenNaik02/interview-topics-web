'use client'

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X, Send } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { useTopicGroups } from '@/lib/TopicsContext'
import { sectionUrl, findGroupForSection, type SectionMeta } from '@/lib/topics'
import { deleteQuestion } from '@/lib/actions/questions'
import type { PriorityLevel } from '@/lib/offlineSync'
import QuestionItem from './QuestionItem'
import AddQuestionModal, { type EditingQuestion } from './AddQuestionModal'

export interface PriorityMixQuestion {
  id: string
  number: number
  title: string
  bodyHtml: string
  markdown?: string | null
  createdBy?: string | null
  topic: string
  file: string
  label: string
  groupSlug: string
  lang?: string | null
  tags?: string | null
  problem?: string | null
  priority: PriorityLevel
}

interface Props {
  questions: PriorityMixQuestion[]
}

const PRI_OPTIONS: { k: PriorityLevel; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
]
const PRI_RANK: Record<PriorityLevel, number> = { high: 3, med: 2, low: 1 }

interface FlatSub {
  key: string
  label: string
  topicName: string
}

const MAX_SUB_CHIPS = 3

// Cmd-K-style multi-select: chips + search trigger + keyboard-navigable
// overlay, so picking subtopics across many topics doesn't need a giant
// checkbox tree.
function SubtopicCommandPalette({ flatSubs, selected, onToggle, onClose }: { flatSubs: FlatSub[]; selected: Set<string>; onToggle: (key: string) => void; onClose: () => void }) {
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => { setActiveIdx(0) }, [query])

  const q = query.toLowerCase()
  const filtered = flatSubs.filter(s => !q || s.label.toLowerCase().includes(q) || s.topicName.toLowerCase().includes(q))
  const chosen = flatSubs.filter(s => selected.has(s.key))

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return }
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)); return }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); return }
    if (e.key === 'Enter') { e.preventDefault(); const s = filtered[activeIdx]; if (s) onToggle(s.key) }
  }

  return (
    <div className="scp-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="scp-palette" role="dialog" aria-modal="true" aria-label="Choose subtopics">
        <div className="scp-search-row">
          <Search size={18} />
          <input
            ref={inputRef}
            value={query}
            placeholder="Jump to a subtopic…"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button className="scp-esc" onClick={onClose}>ESC</button>
        </div>
        <div className="scp-list">
          {filtered.length === 0 && <div className="ssp-empty">No subtopics match &quot;{query}&quot;</div>}
          {filtered.map((s, i) => {
            const on = selected.has(s.key)
            return (
              <button
                key={s.key}
                type="button"
                className={`scp-row ${on ? 'sel' : ''} ${i === activeIdx ? 'active' : ''}`}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => onToggle(s.key)}
                aria-pressed={on}
              >
                <span className="scp-dot" />
                <span className="scp-name">{s.label}</span>
                <span className="scp-topic">{s.topicName}</span>
                {i === activeIdx && <span className="scp-enter">↵</span>}
              </button>
            )
          })}
        </div>
        {chosen.length > 0 && (
          <div className="scp-tray">
            {chosen.map(s => (
              <span key={s.key} className="scp-chip">
                <span className="scp-chip-topic">{s.topicName}</span>{s.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SubtopicPicker({ flatSubs, selected, onToggle }: { flatSubs: FlatSub[]; selected: Set<string>; onToggle: (key: string) => void }) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  const chosen = flatSubs.filter(s => selected.has(s.key))
  const shown = chosen.slice(0, MAX_SUB_CHIPS)
  const rest = chosen.slice(MAX_SUB_CHIPS)

  return (
    <div className="ssp-outer">
      <div className="ssp-chip-row">
        {shown.map(s => (
          <span key={s.key} className="ssp-chip">
            <span className="scp-chip-topic">{s.topicName}</span>{s.label}
            <button type="button" onClick={() => onToggle(s.key)} aria-label={`Remove ${s.label}`}><X size={8} /></button>
          </span>
        ))}
        {rest.length > 0 && (
          <button type="button" className="ssp-chip-more" onClick={() => setPaletteOpen(true)}>+{rest.length} more</button>
        )}
      </div>
      <button type="button" className="ssp-trigger" onClick={() => setPaletteOpen(true)}>
        <Search size={14} />
        <span>{chosen.length ? 'Add or edit subtopics…' : 'Search subtopics…'}</span>
      </button>
      {paletteOpen && (
        <SubtopicCommandPalette flatSubs={flatSubs} selected={selected} onToggle={onToggle} onClose={() => setPaletteOpen(false)} />
      )}
    </div>
  )
}

export default function PriorityMixClient({ questions }: Props) {
  const { getPriority, isComplete, toggle, setPriority, isOnline, offlineModeEnabled, mounted, user } = useProgress()
  const groups = useTopicGroups()
  const flatSubs = useMemo(() => groups.flatMap(g =>
    g.sections.map((s: SectionMeta) => ({ key: sectionUrl(s), label: s.label, topicName: g.groupName }))
  ), [groups])
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null)

  const [selPri, setSelPri] = useState<Set<PriorityLevel>>(new Set())
  const [selSubs, setSelSubs] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState<'all' | 'unchecked' | 'checked'>('all')

  const togglePri = (k: PriorityLevel) => setSelPri(prev => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k); else next.add(k)
    return next
  })
  const toggleSub = (key: string) => setSelSubs(prev => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key); else next.add(key)
    return next
  })
  const clearAll = () => { setSelPri(new Set()); setSelSubs(new Set()); setStatus('all') }

  // Live priority per question — reflects current ProgressContext state
  // rather than the server snapshot at page load, so unflagging a question
  // (or flagging one elsewhere and coming back) is picked up without a reload.
  const flagged = useMemo(() => {
    if (!mounted) return []
    return questions
      .map(q => ({ q, priority: getPriority(q.id), subKey: sectionUrl({ topic: q.topic, file: q.file, label: q.label }) }))
      .filter((r): r is { q: PriorityMixQuestion; priority: PriorityLevel; subKey: string } => r.priority !== null)
  }, [questions, getPriority, mounted])

  const priCounts = useMemo(() => {
    const c: Record<PriorityLevel, number> = { high: 0, med: 0, low: 0 }
    for (const r of flagged) c[r.priority]++
    return c
  }, [flagged])

  const hasBoth = selPri.size > 0 && selSubs.size > 0
  const matched = useMemo(() => {
    if (!hasBoth) return []
    return flagged
      .filter(r => selPri.has(r.priority) && selSubs.has(r.subKey))
      .filter(r => status === 'checked' ? isComplete(r.q.id) : status === 'unchecked' ? !isComplete(r.q.id) : true)
      .sort((a, b) => PRI_RANK[b.priority] - PRI_RANK[a.priority])
  }, [flagged, selPri, selSubs, status, hasBoth, isComplete])

  // Changing a question's priority can move it elsewhere in this sorted/
  // filtered list — that's expected. What shouldn't happen is the viewport
  // following it there: the user is reading wherever they currently are and
  // wants to keep reading from that same spot, not get dragged to the
  // question's new slot. So pin the raw window scroll offset across the
  // reorder instead of trying to keep any particular row in view.
  const savedScrollYRef = useRef<number | null>(null)

  const handleSetPriority = (id: string, level: PriorityLevel | null) => {
    savedScrollYRef.current = window.scrollY
    setPriority(id, level)
  }

  useLayoutEffect(() => {
    if (savedScrollYRef.current === null) return
    window.scrollTo(0, savedScrollYRef.current)
    savedScrollYRef.current = null
  }, [matched])

  const selectedSubLabels = flatSubs.filter(s => selSubs.has(s.key)).map(s => s.label)
  const priTxt = selPri.size ? PRI_OPTIONS.filter(p => selPri.has(p.k)).map(p => p.label).join(' + ') : 'any priority'
  const subTxt = selectedSubLabels.length
    ? (selectedSubLabels.length <= 2 ? selectedSubLabels.join(', ') : `${selectedSubLabels.length} subtopics`)
    : 'any subtopic'
  const STATUS_LABEL = { all: 'any status', unchecked: 'unchecked only', checked: 'checked only' }
  const summary = (!selPri.size && !selSubs.size)
    ? 'Nothing selected yet — pick a priority and subtopics'
    : `${priTxt} · ${subTxt} · ${STATUS_LABEL[status]}${hasBoth ? ` — ${matched.length} question${matched.length === 1 ? '' : 's'}` : ''}`

  const requireOnline = () => {
    if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return true }
    return false
  }

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Custom set</div>
        <h1 className="subtopic-title">Priority Mix</h1>
        <p className="build-lede">Pick a priority and the subtopics you want — the matching questions get pulled onto this page.</p>
      </div>

      <div className="builder">
        <div className="bd-row">
          <span className="bd-lab">Priority</span>
          <div className="aq-pills">
            {PRI_OPTIONS.map(p => (
              <button key={p.k} type="button" className={`aq-pill ${p.k} ${selPri.has(p.k) ? 'on' : ''}`} onClick={() => togglePri(p.k)} aria-pressed={selPri.has(p.k)}>
                <span className="pdot" />{p.label} <span className="pct">{priCounts[p.k]}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="bd-row">
          <span className="bd-lab">Subtopics</span>
          <SubtopicPicker flatSubs={flatSubs} selected={selSubs} onToggle={toggleSub} />
        </div>
        <div className="bd-row">
          <span className="bd-lab">Status</span>
          <div className="aq-pills">
            <button type="button" className={`aq-pill ${status === 'all' ? 'on' : ''}`} onClick={() => setStatus('all')} aria-pressed={status === 'all'}>All</button>
            <button type="button" className={`aq-pill ${status === 'unchecked' ? 'on' : ''}`} onClick={() => setStatus('unchecked')} aria-pressed={status === 'unchecked'}>Unchecked only</button>
            <button type="button" className={`aq-pill ${status === 'checked' ? 'on' : ''}`} onClick={() => setStatus('checked')} aria-pressed={status === 'checked'}>Checked only</button>
          </div>
        </div>
        <div className="bd-foot">
          <span className="bd-summary">{summary}</span>
          {(selPri.size > 0 || selSubs.size > 0) && <button type="button" className="bd-clear" onClick={clearAll}>Clear</button>}
        </div>
      </div>

      {!hasBoth ? (
        <div className="empty-set">
          <div className="es-title">Your set is empty</div>
          <div className="es-sub">Select at least one priority and one subtopic above to pull matching questions onto this page.</div>
        </div>
      ) : matched.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">No matches</div>
          <div className="es-sub">
            {flagged.length === 0
              ? "You haven't flagged any questions with a priority yet. Open a subtopic, set a High/Med/Low priority on a few questions, then come back here."
              : 'No questions match this combination. Try a different priority or subtopic.'}
          </div>
        </div>
      ) : (
        <div className="questions-list">
          {matched.map((r, i) => {
            const group = findGroupForSection(groups, { topic: r.q.topic, file: r.q.file, label: r.q.label })
            const section: SectionMeta = { topic: r.q.topic, file: r.q.file, label: r.q.label }
            const canManage = mounted && !!user && (r.q.createdBy === user.id || user.app_metadata?.is_admin === true)
            return (
              <QuestionItem
                key={r.q.id}
                q={{ id: r.q.id, number: r.q.number, title: r.q.title, bodyHtml: r.q.bodyHtml, problem: r.q.problem }}
                idx={i}
                isDone={isComplete(r.q.id)}
                isOpen={openId === r.q.id}
                priority={r.priority}
                onToggleOpen={() => {
                  if (requireOnline()) return
                  setOpenId(openId === r.q.id ? null : r.q.id)
                }}
                onToggleDone={() => {
                  if (requireOnline()) return
                  toggle(r.q.id)
                }}
                onSetPriority={(level) => handleSetPriority(r.q.id, level)}
                crumb={{ topicLabel: group?.groupName ?? r.q.groupSlug, subLabel: r.q.label, href: r.subKey }}
                onEdit={canManage ? () => setEditingQuestion({
                  id: r.q.id,
                  title: r.q.title,
                  markdown: r.q.markdown ?? '',
                  section,
                  priority: r.priority,
                  lang: r.q.lang,
                  tags: r.q.tags,
                  problem: r.q.problem,
                }) : undefined}
                onDelete={canManage ? async () => {
                  await deleteQuestion(r.q.id)
                  router.refresh()
                } : undefined}
              />
            )
          })}
        </div>
      )}

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

      {editingQuestion && (
        <AddQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            setEditingQuestion(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
