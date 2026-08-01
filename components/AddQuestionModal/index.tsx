'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Github, Loader2, Sparkles, RefreshCw, SlidersHorizontal, AlignLeft, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { useProgress } from '@/lib/context/ProgressContext'
import { useTopicGroups } from '@/lib/context/TopicsContext'
import { addQuestion, updateQuestion } from '@/lib/actions/questions'
import { addTopicGroup, addSection } from '@/lib/actions/topics'
import { findGroupForSection, type SectionMeta } from '@/lib/topics'
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels'
import { loadPresets, getActiveInstructionText } from '@/lib/instructionPresets'
import type { PriorityLevel } from '@/lib/offlineSync'
import { useTypewriter } from '@/lib/useTypewriter'
import AqSelect from '../AqSelect'
import MarkdownField from './MarkdownField'
import InstructionsModal from './InstructionsModal'
import { useAnswerVersions } from './useAnswerVersions'
import { useAiActions } from './useAiActions'
import {
  PRIORITY_OPTIONS, LANG_OPTIONS, AQ_MODEL_KEY, PENDING_GROUP_SLUG, PENDING_SECTION_KEY,
  type Props, type PendingPlacement,
} from './types'

export type { EditingQuestion } from './types'

export default function AddQuestionModal({ defaultSection, editing, prefillTitle, fromInboxId, prefillMarkdown, prefillLang, prefillTags, prefillProblem, fromSetAsideId, onClose, onSaved }: Props) {
  const { user, mounted, signInWithGitHub, setPriority, removeInboxItem, removeSetAsideItem, defaultPriority } = useProgress()
  const isEdit = !!editing

  // A freshly-added topic with no subtopics yet has nowhere to attach a
  // question — exclude it from the picker until it has at least one section.
  const groups = useTopicGroups().filter(g => g.sections.length > 0)

  const initialSection = editing?.section ?? defaultSection
  const initialGroup = initialSection ? findGroupForSection(groups, initialSection) : null
  const [groupSlug, setGroupSlug] = useState(initialGroup?.slug ?? groups[0].slug)
  const isPendingGroup = groupSlug === PENDING_GROUP_SLUG
  const group = isPendingGroup ? null : (groups.find(g => g.slug === groupSlug) ?? groups[0])

  const sectionKey = (s: SectionMeta) => `${s.topic}/${s.file}`
  // Lazy initializer: evaluated once at mount, when groupSlug can't yet be
  // the pending-topic sentinel — safe to assume a real group here.
  const [sectionK, setSectionK] = useState(() => {
    if (initialSection) return sectionKey(initialSection)
    const mountGroup = groups.find(g => g.slug === groupSlug) ?? groups[0]
    return sectionKey(mountGroup.sections[0])
  })
  const section = group?.sections.find(s => sectionKey(s) === sectionK) ?? group?.sections[0]

  // A suggestion staged via "Use this placement" for a topic/subtopic that
  // doesn't exist yet — surfaced as a synthetic option (below) and only
  // created for real in handleSave, so cancelling the modal leaves no
  // orphaned topic/subtopic behind.
  const [pendingPlacement, setPendingPlacement] = useState<PendingPlacement | null>(null)

  const pendingTopic = pendingPlacement?.kind === 'new-topic' ? pendingPlacement : null
  const pendingSubtopicForGroup = pendingPlacement?.kind === 'new-subtopic' && pendingPlacement.groupSlug === groupSlug ? pendingPlacement : null

  const topicOptions = [
    ...groups.map(g => ({ value: g.slug, label: g.groupName })),
    ...(pendingTopic ? [{ value: PENDING_GROUP_SLUG, label: pendingTopic.topicName, sub: 'new' }] : []),
  ]
  const sectionOptions = pendingTopic && isPendingGroup
    ? [{ value: PENDING_SECTION_KEY, label: pendingTopic.label, sub: 'new' }]
    : [
        ...(group?.sections ?? []).map(s => ({ value: sectionKey(s), label: s.label })),
        ...(pendingSubtopicForGroup ? [{ value: PENDING_SECTION_KEY, label: pendingSubtopicForGroup.label, sub: 'new' }] : []),
      ]
  const activeTopicName = isPendingGroup && pendingTopic ? pendingTopic.topicName : (group?.groupName ?? '')
  const activeSectionLabel = sectionK === PENDING_SECTION_KEY && pendingPlacement ? pendingPlacement.label : (section?.label ?? '')

  const [title, setTitle] = useState(editing?.title ?? prefillTitle ?? '')
  const [priority, setPriorityLevel] = useState<PriorityLevel | null>(editing?.priority ?? defaultPriority)
  const [lang, setLang] = useState(editing?.lang || prefillLang || 'js')
  const [tags, setTags] = useState(editing?.tags ?? prefillTags ?? '')
  const [markdown, setMarkdown] = useState(editing?.markdown ?? prefillMarkdown ?? '')
  const [isImpl, setIsImpl] = useState(!!editing?.problem || !!prefillProblem)
  const [problem, setProblem] = useState(editing?.problem ?? prefillProblem ?? '')
  const [tab, setTab] = useState<'write' | 'preview'>('write')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const firstFieldRef = useRef<HTMLInputElement>(null)

  const [showInstructions, setShowInstructions] = useState(false)
  // Seeded from the built-in default matching isImpl (text vs. code-only) —
  // per-question edits below are this question's local draft only and must
  // never persist as a global override.
  const [instructions, setInstructions] = useState(() => getActiveInstructionText(isImpl))
  const [model, setModel] = useState<AqModelId>(() => {
    try {
      const saved = localStorage.getItem(AQ_MODEL_KEY)
      return AQ_MODELS.some(m => m.id === saved) ? (saved as AqModelId) : AQ_MODELS[0].id
    } catch { return AQ_MODELS[0].id }
  })
  const typewrite = useTypewriter(setMarkdown)
  const typewriteQuestion = useTypewriter(setTitle)
  const typewriteProblem = useTypewriter(setProblem)

  const originalTitle = editing?.title ?? ''
  const canRevertTitle = isEdit && !!originalTitle && title !== originalTitle
  const handleRevertTitle = () => setTitle(originalTitle)

  const originalMarkdown = editing?.markdown ?? ''
  const {
    answerVersions, activeVersionId, snapshotCurrentAnswer, addAnswerVersion, handleMarkdownChange, handleSelectAnswerVersion,
  } = useAnswerVersions(markdown, setMarkdown, originalMarkdown)

  const ai = useAiActions({
    title, markdown, activeTopicName, activeSectionLabel, isImpl, lang, tags, model, instructions,
    section, isEdit, editingId: editing?.id, groups, groupSlug, sectionK,
    typewrite, typewriteQuestion, typewriteProblem, setTab, snapshotCurrentAnswer, addAnswerVersion,
    setGroupSlug, setSectionK, setPendingPlacement,
  })

  useEffect(() => { firstFieldRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => {
    if (sectionOptions.some(o => o.value === sectionK)) return
    if (sectionOptions[0]) setSectionK(sectionOptions[0].value)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupSlug])
  // A duplicate check is only valid for the topic/subtopic it ran against —
  // picking a different one invalidates the result without needing a re-check.
  useEffect(() => { ai.setDupState('idle'); ai.setDupResult(null) }, [groupSlug, sectionK]) // eslint-disable-line react-hooks/exhaustive-deps
  // Follows the Implementation toggle for a still-untouched instructions
  // draft (still exactly one of the two built-in defaults) — never
  // overwrites instructions the author has actually customized.
  useEffect(() => {
    const presets = loadPresets()
    const textDefault = presets.find(p => p.kind === 'text')?.text ?? ''
    const codeDefault = presets.find(p => p.kind === 'code')?.text ?? ''
    if (instructions === textDefault || instructions === codeDefault) {
      setInstructions(isImpl ? codeDefault : textDefault)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpl])

  const canSave = title.trim().length > 3 && markdown.trim().length > 3 && !saving && (!isImpl || problem.trim().length > 3)
  const canGenerate = title.trim().length > 3 && ai.genState !== 'loading'
  const canFormat = markdown.trim().length > 3 && ai.genState !== 'loading'
  const canGenerateQuestion = ai.questionGen !== 'loading'
  const canGenerateProblem = title.trim().length > 3 && ai.problemGen !== 'loading'
  const canSuggestPlacement = title.trim().length > 3 && ai.placeState !== 'loading'
  // Nothing to compare against yet for a subtopic that doesn't exist until Save.
  const canCheckDuplicate = title.trim().length > 3 && ai.dupState !== 'loading' && !!section && sectionK !== PENDING_SECTION_KEY

  const isAnonymous = mounted && !!user?.is_anonymous
  // Narrowed local so TS can discriminate `.mode` across the JSX below —
  // repeated `ai.placement!.x` reads don't narrow, this does.
  const placement = ai.placement

  const handleModelChange = (id: AqModelId) => {
    setModel(id)
    try { localStorage.setItem(AQ_MODEL_KEY, id) } catch {}
  }

  const handleSaveInstructions = (v: string, m: AqModelId) => {
    setInstructions(v)
    handleModelChange(m)
    setShowInstructions(false)
  }

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      // A staged new topic/subtopic only gets created here, right before the
      // question that needs it — so cancelling out of the modal earlier
      // never leaves an empty topic/subtopic behind.
      let targetSection: SectionMeta
      if (groupSlug === PENDING_GROUP_SLUG && pendingPlacement?.kind === 'new-topic') {
        const newGroup = await addTopicGroup({ groupName: pendingPlacement.topicName, blurb: pendingPlacement.blurb })
        targetSection = (await addSection({ groupSlug: newGroup.slug, label: pendingPlacement.label })).section
      } else if (sectionK === PENDING_SECTION_KEY && pendingPlacement?.kind === 'new-subtopic') {
        targetSection = (await addSection({ groupSlug: pendingPlacement.groupSlug, label: pendingPlacement.label })).section
      } else {
        targetSection = section!
      }

      const input = {
        topic: targetSection.topic,
        file: targetSection.file,
        title,
        markdown,
        lang,
        tags,
        problem: isImpl ? problem : '',
      }
      const q = isEdit ? await updateQuestion(editing!.id, input) : await addQuestion(input)
      if (priority) setPriority(q.id, priority)
      if (fromInboxId) removeInboxItem(fromInboxId)
      if (fromSetAsideId) removeSetAsideItem(fromSetAsideId)
      onSaved(q, targetSection)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this question — try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-modal" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit question' : fromInboxId ? 'Assign from Inbox' : fromSetAsideId ? 'Assign to a topic' : 'Add question'}>
        <div className="aq-head">
          <h2>{isEdit ? 'Edit question' : fromInboxId ? 'Assign from Inbox' : fromSetAsideId ? 'Assign to a topic' : 'Add question'}</h2>
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
              <div className="aq-field">
                <div className="aq-label-row">
                  <label>Placement</label>
                  <button
                    type="button"
                    className={`aq-generate-btn ${ai.placeState === 'loading' ? 'loading' : ''}`}
                    onClick={ai.handleSuggestPlacement}
                    disabled={!canSuggestPlacement}
                    title={title.trim().length > 3 ? 'Suggest where this question belongs, using the existing topics' : 'Write a question first'}
                  >
                    {ai.placeState === 'loading' ? (
                      <><span className="aq-gen-spinner" />Thinking…</>
                    ) : (
                      <><Sparkles size={12.5} /> Suggest placement</>
                    )}
                  </button>
                </div>
                {ai.placeState === 'error' && <div className="aq-gen-error" style={{ padding: '0 0 6px', background: 'none' }}>Couldn&apos;t get a suggestion — try again.</div>}
              </div>

              <div className="aq-row">
                <div className="aq-field">
                  <label htmlFor="aq-topic">Topic</label>
                  <AqSelect
                    id="aq-topic"
                    value={groupSlug}
                    onChange={setGroupSlug}
                    options={topicOptions}
                  />
                </div>
                <div className="aq-field">
                  <label htmlFor="aq-subtopic">Subtopic</label>
                  <AqSelect
                    id="aq-subtopic"
                    value={sectionK}
                    onChange={setSectionK}
                    options={sectionOptions}
                  />
                </div>
              </div>

              {placement && (
                <div className="aq-suggest-card">
                  <div className="aq-suggest-path">
                    <Sparkles size={13} />
                    <span>
                      {placement.mode === 'existing' && (
                        <>
                          <b>{groups.find(g => g.slug === placement.groupSlug)?.groupName}</b>
                          {' → '}
                          <b>{groups.find(g => g.slug === placement.groupSlug)?.sections.find(s => s.topic === placement.topic && s.file === placement.file)?.label}</b>
                        </>
                      )}
                      {placement.mode === 'new-subtopic' && (
                        <>
                          <b>{groups.find(g => g.slug === placement.groupSlug)?.groupName}</b>
                          {' → '}
                          <b>{placement.label}</b><span className="aq-suggest-badge">new subtopic</span>
                        </>
                      )}
                      {placement.mode === 'new-topic' && (
                        <>
                          <b>{placement.topicName}</b><span className="aq-suggest-badge">new topic</span>
                          {' → '}
                          <b>{placement.label}</b><span className="aq-suggest-badge">new subtopic</span>
                        </>
                      )}
                    </span>
                  </div>
                  {placement.reasoning && <p className="aq-suggest-reason">{placement.reasoning}</p>}
                  <div className="aq-suggest-actions">
                    <button type="button" className="btn-cancel" onClick={ai.clearPlacement}>Choose manually</button>
                    <button type="button" className="btn-primary" onClick={ai.handleApplyPlacement}>Use this placement</button>
                  </div>
                </div>
              )}

              <div className="aq-field">
                <div className="aq-label-row">
                  <label htmlFor="aq-question">Question</label>
                  <div className="aq-label-actions">
                    <button
                      type="button"
                      className={`aq-generate-btn ${ai.questionGen === 'loading' ? 'loading' : ''}`}
                      onClick={ai.handleGenerateQuestion}
                      disabled={!canGenerateQuestion}
                      title={title.trim() ? 'Generate a fresh question, using your text above as a rough idea' : 'Generate a question for this topic/subtopic'}
                    >
                      {ai.questionGen === 'loading' ? (
                        <><span className="aq-gen-spinner" />Generating…</>
                      ) : (
                        <><Sparkles size={12.5} /> {title.trim() ? 'Regenerate' : 'Generate question'}</>
                      )}
                    </button>
                    {canRevertTitle && (
                      <button type="button" className="aq-generate-btn aq-revert-btn" onClick={handleRevertTitle} title="Restore the original saved question text">
                        <RefreshCw size={12.5} /> Revert to original
                      </button>
                    )}
                    <button
                      type="button"
                      className={`aq-generate-btn ${ai.dupState === 'loading' ? 'loading' : ''}`}
                      onClick={ai.handleCheckDuplicate}
                      disabled={!canCheckDuplicate}
                      title="Check this question against existing ones in the selected subtopic"
                    >
                      {ai.dupState === 'loading' ? (
                        <><span className="aq-gen-spinner" />Checking…</>
                      ) : (
                        <><Sparkles size={12.5} /> Check for duplicates</>
                      )}
                    </button>
                  </div>
                </div>
                <input
                  id="aq-question" ref={firstFieldRef} className="aq-input" type="text"
                  placeholder="e.g. What is the difference between let, const, and var?"
                  value={title} onChange={(e) => setTitle(e.target.value)}
                />
                {ai.questionGen === 'error' && <div className="aq-gen-error">Couldn&apos;t generate a question — try again.</div>}
                {ai.dupState === 'error' && <div className="aq-gen-error">Couldn&apos;t check for duplicates — try again.</div>}
                {ai.dupState === 'done' && ai.dupResult && (
                  <div className={`aq-dup-card ${ai.dupResult.isDuplicate ? 'is-dup' : 'is-clear'}`}>
                    <div className="aq-dup-head">
                      {ai.dupResult.isDuplicate ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
                      <span>{ai.dupResult.isDuplicate ? 'Possible duplicate found' : 'No duplicate found'}</span>
                    </div>
                    {ai.dupResult.match && (
                      <>
                        <span className="aq-dup-label">Matched question</span>
                        <p className="aq-dup-match">&ldquo;{ai.dupResult.match}&rdquo;</p>
                      </>
                    )}
                    {ai.dupResult.reasoning && <p className="aq-suggest-reason">{ai.dupResult.reasoning}</p>}
                  </div>
                )}
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
                        className={`aq-generate-btn ${ai.problemGen === 'loading' ? 'loading' : ''}`}
                        onClick={ai.handleGenerateProblem}
                        disabled={!canGenerateProblem}
                        title={canGenerateProblem ? 'Generate a problem statement from the question above' : 'Add a question above first'}
                      >
                        {ai.problemGen === 'loading' ? (
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
                    {ai.problemGen === 'error' && <div className="aq-gen-error">Couldn&apos;t generate — try again.</div>}
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
                <MarkdownField
                  tab={tab}
                  onTabChange={setTab}
                  value={markdown}
                  onChange={handleMarkdownChange}
                  readOnly={ai.genState === 'loading'}
                  textareaClassName={ai.genState === 'loading' ? 'aq-gen-active' : ''}
                  placeholder={isImpl
                    ? 'Paste or write the solution code here — wrap it in a fenced code block, e.g. ```jsx ... ```. Keep this to code only; the problem statement above already covers the explanation. Or click Generate answer above to draft one.'
                    : 'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables. Or click Generate answer above to draft one from your question.'}
                  emptyPreviewText="Live preview appears here as you type…"
                  toolbar={
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
                        onClick={ai.handleFormat}
                        disabled={!canFormat}
                        title={canFormat ? "Reformat the text below into the app's markdown answer style — keeps your content as-is" : 'Write or paste an answer below first'}
                      >
                        <AlignLeft size={13} /> Format
                      </button>
                      <button
                        type="button"
                        className={`aq-generate-btn ${ai.genState === 'loading' ? 'loading' : ''}`}
                        onClick={ai.handleGenerate}
                        disabled={!canGenerate}
                        title={canGenerate ? 'Generate an answer from the question above' : 'Add a question above first'}
                      >
                        {ai.genState === 'loading' ? (
                          <><span className="aq-gen-spinner" />Generating…</>
                        ) : ai.genState === 'done' || ai.genState === 'error' || ai.genState === 'limited' ? (
                          <><RefreshCw size={12.5} /> Regenerate</>
                        ) : (
                          <><Sparkles size={12.5} /> Generate answer</>
                        )}
                      </button>
                    </div>
                  }
                  belowTabs={
                    <>
                      {answerVersions.length >= 1 && (
                        <div className="aq-version-row">
                          <span className="aq-version-label">Drafts:</span>
                          {answerVersions.map(v => (
                            <button
                              type="button"
                              key={v.id}
                              className={`aq-version-chip ${activeVersionId === v.id ? 'active' : ''}`}
                              onClick={() => handleSelectAnswerVersion(v)}
                              title={v.text.slice(0, 140)}
                            >
                              {v.label}
                            </button>
                          ))}
                        </div>
                      )}
                      {ai.genState === 'error' && ai.genError && <div className="aq-gen-error">{ai.genError}</div>}
                      {ai.genState === 'limited' && (
                        <div className="aq-gen-error">
                          {AQ_MODELS.find(m => m.id === model)?.label ?? 'This model'} looks rate-limited — open Instructions to switch models, or try again shortly.
                        </div>
                      )}
                    </>
                  }
                  afterPanes={ai.genState === 'done' && <div className="aq-gen-note"><Sparkles size={11} />AI-drafted — review before saving.</div>}
                />
              </div>

              {showInstructions && (
                <InstructionsModal
                  value={instructions}
                  model={model}
                  isImpl={isImpl}
                  onClose={() => setShowInstructions(false)}
                  onSave={handleSaveInstructions}
                />
              )}

              {error && <div className="aq-gen-error">{error}</div>}
            </div>

            <div className="aq-foot">
              <span className="aq-foot-left">
                {isEdit
                  ? 'Saving updates this question in place, everywhere it appears.'
                  : fromInboxId
                    ? 'Saves the question and removes it from your Inbox.'
                    : fromSetAsideId
                      ? 'Saves the question to the topic above and removes it from Set aside.'
                      : 'Saving writes this question straight to the database — no file editing needed.'}
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
