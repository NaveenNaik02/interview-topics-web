'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { X, Github, Loader2 } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { addQuestion } from '@/lib/actions/questions'
import { TOPIC_GROUPS, findGroupForSection, type SectionMeta } from '@/lib/topics'
import { isLocalSupabase } from '@/lib/utils'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'

interface Props {
  defaultSection?: SectionMeta
  onClose: () => void
  onCreated: (question: ParsedQuestion, section: SectionMeta) => void
}

function renderPreviewHtml(markdown: string): string {
  if (!markdown.trim()) return ''
  const raw = marked.parse(markdown, { breaks: true }) as string
  const remapped = raw.replace(/<h[1-6]([^>]*)>/gi, '<h4$1>').replace(/<\/h[1-6]>/gi, '</h4>')
  return DOMPurify.sanitize(remapped)
}

const PRIORITY_OPTIONS: { level: PriorityLevel; label: string }[] = [
  { level: 'high', label: 'High' },
  { level: 'med', label: 'Med' },
  { level: 'low', label: 'Low' },
]

export default function AddQuestionModal({ defaultSection, onClose, onCreated }: Props) {
  const { user, mounted, signInWithGitHub, setPriority } = useProgress()

  const initialGroup = defaultSection ? findGroupForSection(defaultSection) : null
  const [groupSlug, setGroupSlug] = useState(initialGroup?.slug ?? TOPIC_GROUPS[0].slug)
  const group = TOPIC_GROUPS.find(g => g.slug === groupSlug) ?? TOPIC_GROUPS[0]

  const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`
  const [sectionK, setSectionK] = useState(
    defaultSection ? sectionKey(defaultSection) : sectionKey(group.sections[0])
  )
  const section = group.sections.find(s => sectionKey(s) === sectionK) ?? group.sections[0]

  const [title, setTitle] = useState('')
  const [priority, setPriorityLevel] = useState<PriorityLevel | null>('med')
  const [markdown, setMarkdown] = useState('')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  useEffect(() => { firstFieldRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (!group.sections.some(s => sectionKey(s) === sectionK)) {
      setSectionK(sectionKey(group.sections[0]))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug])

  const previewHtml = useMemo(() => renderPreviewHtml(markdown), [markdown])
  const canSave = title.trim().length > 3 && markdown.trim().length > 3 && !saving

  const isAnonymous = mounted && !!user?.is_anonymous && !isLocalSupabase()

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const q = await addQuestion({ topic: section.topic, file: section.file, title, markdown })
      if (priority) setPriority(q.id, priority)
      onCreated(q, section)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this question — try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-modal" role="dialog" aria-modal="true" aria-label="Add question">
        <div className="aq-head">
          <h2>Add question</h2>
          <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
        </div>

        {isAnonymous ? (
          <div className="aq-body">
            <p className="aq-signin-msg">Sign in with GitHub to add your own questions — this keeps authorship attached to your account.</p>
            <button className="btn btn-primary" onClick={signInWithGitHub}>
              <Github size={14} /> Sign in with GitHub
            </button>
          </div>
        ) : (
          <>
            <div className="aq-body">
              <div className="aq-row">
                <div className="aq-field">
                  <label htmlFor="aq-topic">Topic</label>
                  <select id="aq-topic" className="aq-select" value={groupSlug} onChange={(e) => setGroupSlug(e.target.value)}>
                    {TOPIC_GROUPS.map(g => <option key={g.slug} value={g.slug}>{g.groupName}</option>)}
                  </select>
                </div>
                <div className="aq-field">
                  <label htmlFor="aq-subtopic">Subtopic</label>
                  <select id="aq-subtopic" className="aq-select" value={sectionK} onChange={(e) => setSectionK(e.target.value)}>
                    {group.sections.map(s => <option key={sectionKey(s)} value={sectionKey(s)}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="aq-field">
                <label htmlFor="aq-question">Question</label>
                <input
                  id="aq-question" ref={firstFieldRef} className="aq-input" type="text"
                  placeholder="e.g. What is the difference between let, const, and var?"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="aq-field">
                <label>Priority</label>
                <div className="aq-pills">
                  {PRIORITY_OPTIONS.map(o => (
                    <button
                      key={o.level} type="button"
                      className={`aq-pill ${o.level} ${priority === o.level ? 'on' : ''}`}
                      onClick={() => setPriorityLevel(priority === o.level ? null : o.level)}
                    >
                      <span className="pdot" />{o.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="aq-field">
                <label>Answer (Markdown)</label>
                <div className="aq-md-wrap">
                  <div className="aq-md-tabs">
                    <div className="aq-md-tabbtns">
                      <button type="button" className={`aq-md-tab ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>Write</button>
                      <button type="button" className={`aq-md-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>Preview</button>
                    </div>
                    <span className="aq-md-hint">Markdown supported</span>
                  </div>
                  <div className={`aq-md-panes single show-${tab === 'write' ? 'editor' : 'preview'}`}>
                    <div className="aq-md-editor-pane">
                      <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        placeholder={'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables.'}
                      />
                    </div>
                    <div className="aq-md-preview-pane">
                      {previewHtml ? (
                        <div className="q-answer q-body" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      ) : (
                        <div className="aq-md-empty">Live preview appears here as you type…</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {error && <div className="aq-gen-error">{error}</div>}
            </div>

            <div className="aq-foot">
              <span className="aq-foot-left">Saving writes this question straight to the database — no file editing needed.</span>
              <div className="aq-foot-actions">
                <button className="btn-cancel" onClick={onClose}>Cancel</button>
                <button className={`btn-primary btn-save ${saving ? 'saving' : ''}`} disabled={!canSave} onClick={handleSave}>
                  {saving ? <Loader2 size={14} className="aq-spin" /> : null}
                  {saving ? 'Saving…' : 'Save question'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
