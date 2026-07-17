'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { X, Github, Loader2, Sparkles, RefreshCw, SlidersHorizontal, AlignLeft } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { useTopicGroups } from '@/lib/TopicsContext'
import { addQuestion, updateQuestion } from '@/lib/actions/questions'
import { generateAnswer } from '@/lib/actions/generateAnswer'
import { generateQuestion } from '@/lib/actions/generateQuestion'
import { generateProblem } from '@/lib/actions/generateProblem'
import { formatAnswer } from '@/lib/actions/formatAnswer'
import { findGroupForSection, type SectionMeta } from '@/lib/topics'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'
import { loadPresets, loadActivePresetId, getActiveInstructionText } from '@/lib/instructionPresets'
import type { ParsedQuestion } from '@/lib/parser'
import type { PriorityLevel } from '@/lib/offlineSync'
import { useTypewriter } from '@/lib/useTypewriter'
import AqSelect from './AqSelect'

export interface EditingQuestion {
  id: string
  title: string
  markdown: string
  section: SectionMeta
  priority: PriorityLevel | null
  lang?: string | null
  tags?: string | null
  problem?: string | null
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

const LANG_OPTIONS = ['js', 'jsx', 'ts', 'html', 'css', 'bash', 'none']

const AQ_MODEL_KEY = 'prep-tracker:ai-model'

function AqInstructionsModal({ value, model, onClose, onSave }: { value: string; model: AqModelId; onClose: () => void; onSave: (v: string, m: AqModelId) => void }) {
  const [draft, setDraft] = useState(value)
  const [draftModel, setDraftModel] = useState<AqModelId>(model)
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const presets = useMemo(loadPresets, [])
  const [presetPick, setPresetPick] = useState(() => loadActivePresetId(presets))
  const html = useMemo(() => renderPreviewHtml(draft), [draft])

  const handleLoadPreset = (id: string) => {
    setPresetPick(id)
    if (!id) return
    const p = presets.find(x => x.id === id)
    if (p) setDraft(p.text)
  }

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
          {presets.length > 1 && (
            <div className="aq-field">
              <label>Start from a saved version <span className="aq-customize-sub">(loads into this question only — your default in Settings won&apos;t change)</span></label>
              <AqSelect
                value={presetPick}
                onChange={handleLoadPreset}
                options={presets.map(p => ({ value: p.id, label: p.name, sub: p.text.trim() ? undefined : 'Blank' }))}
              />
            </div>
          )}
          <div className="aq-field">
            <label>How should the AI format generated answers? <span className="aq-customize-sub">(this question only)</span></label>
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
          <span className="aq-foot-left">Applies to this question only — manage your default in Settings.</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className="btn-primary btn-save" onClick={() => onSave(draft, draftModel)}>Use for this question</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AddQuestionModal({ defaultSection, editing, onClose, onSaved }: Props) {
  const { user, mounted, signInWithGitHub, setPriority } = useProgress()
  const isEdit = !!editing

  // A freshly-added topic with no subtopics yet has nowhere to attach a
  // question — exclude it from the picker until it has at least one section.
  const groups = useTopicGroups().filter(g => g.sections.length > 0)

  const initialSection = editing?.section ?? defaultSection
  const initialGroup = initialSection ? findGroupForSection(groups, initialSection) : null
  const [groupSlug, setGroupSlug] = useState(initialGroup?.slug ?? groups[0].slug)
  const group = groups.find(g => g.slug === groupSlug) ?? groups[0]

  const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`
  const [sectionK, setSectionK] = useState(
    initialSection ? sectionKey(initialSection) : sectionKey(group.sections[0])
  )
  const section = group.sections.find(s => sectionKey(s) === sectionK) ?? group.sections[0]

  const [title, setTitle] = useState(editing?.title ?? '')
  const [priority, setPriorityLevel] = useState<PriorityLevel | null>(editing?.priority ?? 'med')
  const [lang, setLang] = useState(editing?.lang || 'js')
  const [tags, setTags] = useState(editing?.tags ?? '')
  const [markdown, setMarkdown] = useState(editing?.markdown ?? '')
  const [isImpl, setIsImpl] = useState(!!editing?.problem)
  const [problem, setProblem] = useState(editing?.problem ?? '')
  const [problemGen, setProblemGen] = useState<'idle' | 'loading' | 'error'>('idle')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const [genState, setGenState] = useState<'idle' | 'loading' | 'done' | 'error' | 'limited'>('idle')
  const [genError, setGenError] = useState<string | null>(null)
  const [questionGen, setQuestionGen] = useState<'idle' | 'loading' | 'error'>('idle')
  const [showInstructions, setShowInstructions] = useState(false)
  // Always seeded from whatever preset is active in Settings — per-question
  // edits below are this question's local draft only and must never persist
  // as a global override, or the Settings-selected default would get stuck.
  const [instructions, setInstructions] = useState(() => getActiveInstructionText())
  const [model, setModel] = useState<AqModelId>(() => {
    try {
      const saved = localStorage.getItem(AQ_MODEL_KEY)
      return AQ_MODELS.some(m => m.id === saved) ? (saved as AqModelId) : AQ_MODELS[0].id
    } catch { return AQ_MODELS[0].id }
  })
  const typewrite = useTypewriter(setMarkdown)
  const typewriteQuestion = useTypewriter(setTitle)
  const typewriteProblem = useTypewriter(setProblem)

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
  const canSave = title.trim().length > 3 && markdown.trim().length > 3 && !saving && (!isImpl || problem.trim().length > 3)
  const canGenerate = title.trim().length > 3 && genState !== 'loading'
  const canFormat = markdown.trim().length > 3 && genState !== 'loading'
  const canGenerateQuestion = questionGen !== 'loading'
  const canGenerateProblem = title.trim().length > 3 && problemGen !== 'loading'

  const isAnonymous = mounted && !!user?.is_anonymous

  const handleModelChange = (id: AqModelId) => {
    setModel(id)
    try { localStorage.setItem(AQ_MODEL_KEY, id) } catch {}
  }

  const handleSaveInstructions = (v: string, m: AqModelId) => {
    setInstructions(v)
    handleModelChange(m)
    setShowInstructions(false)
  }

  const handleGenerateQuestion = async () => {
    if (!canGenerateQuestion) return
    setQuestionGen('loading')
    try {
      const text = await generateQuestion({
        topicName: group.groupName,
        subName: section.label,
        seed: title,
        isImpl,
        lang,
        tags,
        model,
      })
      typewriteQuestion(text, () => setQuestionGen('idle'))
    } catch (err) {
      setQuestionGen('error')
      setGenError(err instanceof Error ? err.message : String(err))
    }
  }

  const handleGenerateProblem = async () => {
    if (!canGenerateProblem) return
    setProblemGen('loading')
    try {
      const text = await generateProblem({ question: title, lang, tags, model })
      typewriteProblem(text, () => setProblemGen('idle'))
    } catch {
      setProblemGen('error')
    }
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

  const handleFormat = async () => {
    if (!canFormat) return
    setGenState('loading')
    setGenError(null)
    setTab('write')
    try {
      const text = await formatAnswer({ text: markdown, question: title, instructions, isImpl, lang, model })
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
      const input = {
        topic: section.topic,
        file: section.file,
        title,
        markdown,
        lang,
        tags,
        problem: isImpl ? problem : '',
      }
      const q = isEdit ? await updateQuestion(editing!.id, input) : await addQuestion(input)
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
                    options={groups.map(g => ({ value: g.slug, label: g.groupName }))}
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
                <div className="aq-label-row">
                  <label htmlFor="aq-question">Question</label>
                  <button
                    type="button"
                    className={`aq-generate-btn ${questionGen === 'loading' ? 'loading' : ''}`}
                    onClick={handleGenerateQuestion}
                    disabled={!canGenerateQuestion}
                    title={title.trim() ? 'Generate a fresh question, using your text above as a rough idea' : 'Generate a question for this topic/subtopic'}
                  >
                    {questionGen === 'loading' ? (
                      <><span className="aq-gen-spinner" />Generating…</>
                    ) : (
                      <><Sparkles size={12.5} /> {title.trim() ? 'Regenerate' : 'Generate question'}</>
                    )}
                  </button>
                </div>
                <input
                  id="aq-question" ref={firstFieldRef} className="aq-input" type="text"
                  placeholder="e.g. What is the difference between let, const, and var?"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
                {questionGen === 'error' && <div className="aq-gen-error">Couldn&apos;t generate a question — try again.</div>}
              </div>

              <div className="aq-field">
                <div className="aq-impl-toggle-row">
                  <label className="aq-toggle">
                    <input type="checkbox" checked={isImpl} onChange={(e) => setIsImpl(e.target.checked)} />
                    <span className="aq-toggle-track"><span className="aq-toggle-thumb" /></span>
                  </label>
                  <div className="aq-impl-toggle-copy">
                    <span className="aq-impl-toggle-title">Implementation question</span>
                    <span className="aq-impl-toggle-sub">Shows a Problem → Solution layout instead of a plain answer</span>
                  </div>
                </div>
                {isImpl && (
                  <>
                    <div className="aq-problem-gen-row">
                      <button
                        type="button"
                        className={`aq-generate-btn ${problemGen === 'loading' ? 'loading' : ''}`}
                        onClick={handleGenerateProblem}
                        disabled={!canGenerateProblem}
                        title={canGenerateProblem ? 'Generate a problem statement from the question above' : 'Add a question above first'}
                      >
                        {problemGen === 'loading' ? (
                          <><span className="aq-gen-spinner" />Generating…</>
                        ) : (
                          <><Sparkles size={12.5} /> Generate</>
                        )}
                      </button>
                    </div>
                    <textarea
                      className="aq-input aq-problem-input"
                      rows={3}
                      placeholder="Describe what needs to be implemented — e.g. Write flatten(arr, depth) that flattens nested arrays up to depth levels…"
                      value={problem}
                      onChange={(e) => setProblem(e.target.value)}
                    />
                    {problemGen === 'error' && <div className="aq-gen-error">Couldn&apos;t generate — try again.</div>}
                  </>
                )}
              </div>

              <div className="aq-row">
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
                  <label htmlFor="aq-lang">Code language hint</label>
                  <AqSelect id="aq-lang" value={lang} onChange={setLang} options={LANG_OPTIONS.map(l => ({ value: l, label: l }))} />
                </div>
              </div>

              <div className="aq-field">
                <label htmlFor="aq-tags">Tags <span className="aq-customize-sub">(optional, comma-separated)</span></label>
                <input id="aq-tags" className="aq-input" type="text" placeholder="closures, scope, es6" value={tags} onChange={(e) => setTags(e.target.value)} />
              </div>

              <div className="aq-field">
                <label>Answer {isImpl ? '(code only)' : '(Markdown)'}</label>
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
                        className="aq-format-btn"
                        onClick={handleFormat}
                        disabled={!canFormat}
                        title={canFormat ? "Reformat the text below into the app's markdown answer style — keeps your content as-is" : 'Write or paste an answer below first'}
                      >
                        <AlignLeft size={13} /> Format
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
                        placeholder={isImpl
                          ? 'Paste or write the solution code here — wrap it in a fenced code block, e.g. ```jsx ... ```. Keep this to code only; the problem statement above already covers the explanation. Or click Generate answer above to draft one.'
                          : 'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables. Or click Generate answer above to draft one from your question.'}
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
