'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { X, Github, Loader2, Sparkles, RefreshCw, SlidersHorizontal, ChevronDown } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { addQuestion, updateQuestion } from '@/lib/actions/questions'
import { generateAnswer } from '@/lib/actions/generateAnswer'
import { TOPIC_GROUPS, findGroupForSection, type SectionMeta } from '@/lib/topics'
import { isLocalSupabase } from '@/lib/utils'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'

export interface EditingQuestion {
  id: string
  title: string
  markdown: string
  section: SectionMeta
  priority: PriorityLevel | null
}

interface Props {
  defaultSection?: SectionMeta
  editing?: EditingQuestion
  onClose: () => void
  onSaved: (question: ParsedQuestion, section: SectionMeta) => void
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

const AQ_INSTRUCTIONS_KEY = 'prep-tracker:ai-answer-instructions'
const AQ_MODEL_KEY = 'prep-tracker:ai-model'

// content/answer-draft.md's "Default Format — Opening Sentence + Narrative
// Bullets" (its Cleanup/Maintain Standards/Preserve-wording lines are about
// the /update-answer workflow itself, not content style, so left out here),
// kept concise per the author's "Interview Ready Answer" tone — see
// content/javascript/foundations.md for what the format looks like in practice.
const DEFAULT_AI_INSTRUCTIONS = `- Lead with a bold key term or topic name and a one-line definition in the same sentence, then expand with bullet points written as complete narrative sentences (not fragments). This is the default format.
- Keep it natural and concise, not padded — use only as many bullets as the topic genuinely needs. If the opening sentence alone fully answers it, that's enough.
- Bold key technical terms inline within the sentence as they come up — never as a static label like "**Caching:** ...".
- Use an em dash (—) within a bullet to add contrast or elaboration where it reads naturally.
- Switch to a Markdown table only when the content is inherently comparative (e.g. "X vs Y"). Use code blocks only when a code example is genuinely needed.`

// Reveals generated text a few characters at a time so it reads as being
// written, not dumped in — matches the effect used for manually-typed answers.
function useTypewriter(onChange: (text: string) => void) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stop = () => { if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }
  const run = (full: string, onDone?: () => void) => {
    stop()
    let i = 0
    const step = Math.max(2, Math.round(full.length / 90))
    timerRef.current = setInterval(() => {
      i += step
      if (i >= full.length) {
        onChange(full)
        stop()
        onDone?.()
      } else {
        onChange(full.slice(0, i))
      }
    }, 12)
  }
  useEffect(() => stop, [])
  return run
}

interface AqSelectOption { value: string; label: string; sub?: string }

// Custom-styled dropdown replacing native <select> everywhere in this modal,
// so the menu matches the app's own floating-panel look instead of the
// browser's default listbox chrome.
function AqSelect({ id, value, onChange, options }: { id?: string; value: string; onChange: (v: string) => void; options: AqSelectOption[] }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="aq-dd" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="aq-select aq-dd-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="aq-dd-value">{current ? current.label : '—'}</span>
        <ChevronDown className="aq-dd-chevron" size={12} />
      </button>
      {open && (
        <div className="aq-dd-menu" role="listbox">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`aq-dd-item ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              <span className="aq-dd-item-label">{o.label}</span>
              {o.sub ? <span className="aq-dd-item-sub">{o.sub}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function AqInstructionsModal({ value, model, onClose, onSave }: { value: string; model: AqModelId; onClose: () => void; onSave: (v: string, m: AqModelId) => void }) {
  const [draft, setDraft] = useState(value)
  const [draftModel, setDraftModel] = useState<AqModelId>(model)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const html = useMemo(() => renderPreviewHtml(draft), [draft])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="aq-instr-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-instr-modal" role="dialog" aria-modal="true" aria-label="Instructions">
        <div className="aq-head">
          <h2>Instructions</h2>
          <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
        </div>
        <div className="aq-body">
          <div className="aq-field">
            <label>AI model</label>
            <AqSelect
              value={draftModel}
              onChange={(v) => setDraftModel(v as AqModelId)}
              options={AQ_MODELS.map(m => ({ value: m.id, label: m.label, sub: m.sub }))}
            />
            <p className="aq-model-hint">If a model is rate-limited, switch here and regenerate.</p>
          </div>
          <div className="aq-field">
            <label>How should the AI format generated answers? <span className="aq-customize-sub">(optional — remembered for next time)</span></label>
            <div className="aq-md-wrap">
              <div className="aq-md-tabs">
                <div className="aq-md-tabbtns">
                  <button type="button" className={`aq-md-tab ${tab === 'write' ? 'active' : ''}`} onClick={() => setTab('write')}>Write</button>
                  <button type="button" className={`aq-md-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>Preview</button>
                </div>
                <span className="aq-md-hint">Markdown supported</span>
              </div>
              <div className={`aq-md-panes single show-${tab === 'write' ? 'editor' : 'preview'}`}>
                <div className="aq-md-editor-pane aq-instr-editor-pane">
                  <textarea
                    autoFocus
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={'e.g.\n- Keep answers to 3 short bullets max\n- Always include one runnable code example\n- Bold the key term being defined'}
                  />
                </div>
                <div className="aq-md-preview-pane">
                  {html ? <div className="q-answer q-body prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} /> : <div className="aq-md-empty">Preview appears here as you type…</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left">Applied every time you generate an answer, until you change it.</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-save" onClick={() => onSave(draft, draftModel)}>Save</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AddQuestionModal({ defaultSection, editing, onClose, onSaved }: Props) {
  const { user, mounted, signInWithGitHub, setPriority } = useProgress()
  const isEdit = !!editing

  const initialSection = editing?.section ?? defaultSection
  const initialGroup = initialSection ? findGroupForSection(initialSection) : null
  const [groupSlug, setGroupSlug] = useState(initialGroup?.slug ?? TOPIC_GROUPS[0].slug)
  const group = TOPIC_GROUPS.find(g => g.slug === groupSlug) ?? TOPIC_GROUPS[0]

  const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`
  const [sectionK, setSectionK] = useState(
    initialSection ? sectionKey(initialSection) : sectionKey(group.sections[0])
  )
  const section = group.sections.find(s => sectionKey(s) === sectionK) ?? group.sections[0]

  const [title, setTitle] = useState(editing?.title ?? '')
  const [priority, setPriorityLevel] = useState<PriorityLevel | null>(editing?.priority ?? 'med')
  const [markdown, setMarkdown] = useState(editing?.markdown ?? '')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const [genState, setGenState] = useState<'idle' | 'loading' | 'done' | 'error' | 'limited'>('idle')
  const [genError, setGenError] = useState<string | null>(null)
  const [showInstructions, setShowInstructions] = useState(false)
  const [instructions, setInstructions] = useState(() => {
    // null (never saved) falls back to the default; '' (explicitly cleared
    // and saved) is respected as "no instructions" rather than reverting.
    try { return localStorage.getItem(AQ_INSTRUCTIONS_KEY) ?? DEFAULT_AI_INSTRUCTIONS } catch { return DEFAULT_AI_INSTRUCTIONS }
  })
  const [model, setModel] = useState<AqModelId>(() => {
    try {
      const saved = localStorage.getItem(AQ_MODEL_KEY)
      return AQ_MODELS.some(m => m.id === saved) ? (saved as AqModelId) : AQ_MODELS[0].id
    } catch { return AQ_MODELS[0].id }
  })
  const typewrite = useTypewriter(setMarkdown)

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
  const canGenerate = title.trim().length > 3 && genState !== 'loading'

  const isAnonymous = mounted && !!user?.is_anonymous && !isLocalSupabase()

  const handleModelChange = (id: AqModelId) => {
    setModel(id)
    try { localStorage.setItem(AQ_MODEL_KEY, id) } catch {}
  }

  const handleSaveInstructions = (v: string, m: AqModelId) => {
    setInstructions(v)
    try { localStorage.setItem(AQ_INSTRUCTIONS_KEY, v) } catch {}
    handleModelChange(m)
    setShowInstructions(false)
  }

  const handleGenerate = async () => {
    if (!canGenerate) return
    setGenState('loading')
    setGenError(null)
    setTab('write')
    try {
      const text = await generateAnswer({
        question: title,
        topicName: group.groupName,
        subName: section.label,
        instructions,
        model,
      })
      typewrite(text, () => setGenState('done'))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setGenState(/rate|quota|limit|429|overloaded|exhausted|unavailable/i.test(msg) ? 'limited' : 'error')
      setGenError(msg)
    }
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const q = isEdit
        ? await updateQuestion(editing!.id, { topic: section.topic, file: section.file, title, markdown })
        : await addQuestion({ topic: section.topic, file: section.file, title, markdown })
      if (priority) setPriority(q.id, priority)
      onSaved(q, section)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this question — try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit question' : 'Add question'}>
        <div className="aq-head">
          <h2>{isEdit ? 'Edit question' : 'Add question'}</h2>
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
                  <AqSelect
                    id="aq-topic"
                    value={groupSlug}
                    onChange={setGroupSlug}
                    options={TOPIC_GROUPS.map(g => ({ value: g.slug, label: g.groupName }))}
                  />
                </div>
                <div className="aq-field">
                  <label htmlFor="aq-subtopic">Subtopic</label>
                  <AqSelect
                    id="aq-subtopic"
                    value={sectionK}
                    onChange={setSectionK}
                    options={group.sections.map(s => ({ value: sectionKey(s), label: s.label }))}
                  />
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
                    <div className="aq-gen-controls">
                      <button
                        type="button"
                        className={`aq-customize-btn ${instructions.trim() ? 'has-value' : ''}`}
                        onClick={() => setShowInstructions(true)}
                        title={`Instructions — model: ${AQ_MODELS.find(m => m.id === model)?.label ?? model}`}
                      >
                        <SlidersHorizontal size={14} />
                        {instructions.trim() ? <span className="aq-customize-dot" /> : null}
                      </button>
                      <button
                        type="button"
                        className={`aq-generate-btn ${genState === 'loading' ? 'loading' : ''}`}
                        onClick={handleGenerate}
                        disabled={!canGenerate}
                        title={canGenerate ? 'Generate an answer from the question above' : 'Add a question above first'}
                      >
                        {genState === 'loading' ? (
                          <><span className="aq-gen-spinner" />Generating…</>
                        ) : genState === 'done' || genState === 'error' || genState === 'limited' ? (
                          <><RefreshCw size={12.5} /> Regenerate</>
                        ) : (
                          <><Sparkles size={12.5} /> Generate answer</>
                        )}
                      </button>
                    </div>
                  </div>
                  {genState === 'error' && genError && <div className="aq-gen-error">{genError}</div>}
                  {genState === 'limited' && (
                    <div className="aq-gen-error">
                      {AQ_MODELS.find(m => m.id === model)?.label ?? 'This model'} looks rate-limited — open Instructions to switch models, or try again shortly.
                    </div>
                  )}
                  <div className={`aq-md-panes single show-${tab === 'write' ? 'editor' : 'preview'}`}>
                    <div className="aq-md-editor-pane">
                      <textarea
                        value={markdown}
                        onChange={(e) => setMarkdown(e.target.value)}
                        readOnly={genState === 'loading'}
                        className={genState === 'loading' ? 'aq-gen-active' : ''}
                        placeholder={'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables. Or click Generate answer above to draft one from your question.'}
                      />
                    </div>
                    <div className="aq-md-preview-pane">
                      {previewHtml ? (
                        <div className="q-answer q-body prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: previewHtml }} />
                      ) : (
                        <div className="aq-md-empty">Live preview appears here as you type…</div>
                      )}
                    </div>
                  </div>
                  {genState === 'done' && <div className="aq-gen-note"><Sparkles size={11} />AI-drafted — review before saving.</div>}
                </div>
              </div>

              {showInstructions && (
                <AqInstructionsModal
                  value={instructions}
                  model={model}
                  onClose={() => setShowInstructions(false)}
                  onSave={handleSaveInstructions}
                />
              )}

              {error && <div className="aq-gen-error">{error}</div>}
            </div>

            <div className="aq-foot">
              <span className="aq-foot-left">
                {isEdit ? 'Saving updates this question in place, everywhere it appears.' : 'Saving writes this question straight to the database — no file editing needed.'}
              </span>
              <div className="aq-foot-actions">
                <button className="btn-cancel" onClick={onClose}>Cancel</button>
                <button className={`btn-primary btn-save ${saving ? 'saving' : ''}`} disabled={!canSave} onClick={handleSave}>
                  {saving ? <Loader2 size={14} className="aq-spin" /> : null}
                  {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Save question'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
