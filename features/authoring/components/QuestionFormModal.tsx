'use client';

import { useEffect, useRef, useState } from 'react';
import {
  X,
  Loader2,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  AlignLeft,
} from 'lucide-react';
import { useAppStore } from '@/lib/stores/appStore';
import { AQ_MODELS, type AqModelId } from '@/lib/aiModels';
import {
  loadPresets,
  getActiveInstructionText,
} from '@/lib/instructionPresets';
import type { PriorityLevel } from '@/lib/offlineSync';
import { useTypewriter } from '@/lib/useTypewriter';
import AqSelect from '@/components/AqSelect';
import MarkdownField from './MarkdownField';
import InstructionsModal from './InstructionsModal';
import { PlacementPicker } from './PlacementPicker';
import { QuestionField } from './QuestionField';
import { useAnswerVersions } from '../hooks/useAnswerVersions';
import { useAnswerGenerator } from '../hooks/useAnswerGenerator';
import { usePlacement } from '../hooks/usePlacement';
import {
  PRIORITY_OPTIONS,
  LANG_OPTIONS,
  AQ_MODEL_KEY,
  type QuestionFormProps,
} from '../types';

// The question form itself — it renders exactly what it is given and knows
// nothing about why it is open. Adding, editing, and assigning from
// Inbox/Set aside are all callers that supply their own copy and onSubmit
// (see AddQuestionModal / EditQuestionModal).
export const QuestionFormModal = ({
  heading,
  footNote,
  submitLabel,
  initialSection,
  initial,
  original,
  excludeQuestionId,
  onSubmit,
  onClose,
}: QuestionFormProps) => {
  const defaultPriority = useAppStore((s) => s.defaultPriority);

  const [title, setTitle] = useState(initial?.title ?? '');
  // `null` is a real choice here ("no priority"), so only an absent priority
  // falls back to the user's default.
  const [priority, setPriorityLevel] = useState<PriorityLevel | null>(
    initial?.priority === undefined ? defaultPriority : initial.priority,
  );
  const [lang, setLang] = useState(initial?.lang || 'js');
  const [tags, setTags] = useState(initial?.tags ?? '');
  const [markdown, setMarkdown] = useState(initial?.markdown ?? '');
  const [isImpl, setIsImpl] = useState(!!initial?.problem);
  const [problem, setProblem] = useState(initial?.problem ?? '');
  const [tab, setTab] = useState<'write' | 'preview'>('write');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const [showInstructions, setShowInstructions] = useState(false);
  // Seeded from the built-in default matching isImpl (text vs. code-only) —
  // per-question edits below are this question's local draft only and must
  // never persist as a global override.
  const [instructions, setInstructions] = useState(() =>
    getActiveInstructionText(isImpl),
  );
  const [model, setModel] = useState<AqModelId>(() => {
    try {
      const saved = localStorage.getItem(AQ_MODEL_KEY);
      return AQ_MODELS.some((m) => m.id === saved)
        ? (saved as AqModelId)
        : AQ_MODELS[0].id;
    } catch {
      return AQ_MODELS[0].id;
    }
  });
  const placement = usePlacement({ initialSection, title, tags, model });

  const typewrite = useTypewriter(setMarkdown);

  const originalMarkdown = original?.markdown ?? '';
  const {
    answerVersions,
    activeVersionId,
    snapshotCurrentAnswer,
    addAnswerVersion,
    handleMarkdownChange,
    handleSelectAnswerVersion,
  } = useAnswerVersions(markdown, setMarkdown, originalMarkdown);

  const answerGen = useAnswerGenerator({
    question: title,
    markdown,
    topicName: placement.activeTopicName,
    sectionLabel: placement.activeSectionLabel,
    instructions,
    isImpl,
    lang,
    model,
    typewrite,
    setTab,
    snapshotCurrentAnswer,
    addAnswerVersion,
  });

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  // Follows the Implementation toggle for a still-untouched instructions
  // draft (still exactly one of the two built-in defaults) — never
  // overwrites instructions the author has actually customized.
  useEffect(() => {
    const presets = loadPresets();
    const textDefault = presets.find((p) => p.kind === 'text')?.text ?? '';
    const codeDefault = presets.find((p) => p.kind === 'code')?.text ?? '';
    if (instructions === textDefault || instructions === codeDefault) {
      setInstructions(isImpl ? codeDefault : textDefault);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isImpl]);

  const canSave =
    title.trim().length > 3 &&
    markdown.trim().length > 3 &&
    !saving &&
    (!isImpl || problem.trim().length > 3);
  const canGenerate = title.trim().length > 3 && answerGen.state !== 'loading';
  const canFormat = markdown.trim().length > 3 && answerGen.state !== 'loading';
  const handleModelChange = (id: AqModelId) => {
    setModel(id);
    try {
      localStorage.setItem(AQ_MODEL_KEY, id);
    } catch {}
  };

  const handleSaveInstructions = (v: string, m: AqModelId) => {
    setInstructions(v);
    handleModelChange(m);
    setShowInstructions(false);
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const targetSection = await placement.resolveTargetSection();
      await onSubmit(
        {
          topic: targetSection.topic,
          file: targetSection.file,
          title,
          markdown,
          lang,
          tags,
          problem: isImpl ? problem : '',
          priority,
        },
        targetSection,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not save this question — try again.',
      );
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-scrim"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="aq-modal"
        role="dialog"
        aria-modal="true"
        aria-label={heading}
      >
        <div className="aq-head">
          <h2>{heading}</h2>
          <button
            className="aq-close"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        <div className="aq-body">
          <PlacementPicker placement={placement} />

          <QuestionField
            value={title}
            onChange={setTitle}
            inputRef={firstFieldRef}
            originalTitle={original?.title}
            placement={placement}
            lang={lang}
            tags={tags}
            model={model}
            isImpl={isImpl}
            onImplChange={setIsImpl}
            problem={problem}
            onProblemChange={setProblem}
            excludeQuestionId={excludeQuestionId}
          />

          <div className="aq-row">
            <div className="aq-field">
              <label>Priority</label>
              <div className="aq-pills">
                {PRIORITY_OPTIONS.map((o) => (
                  <button
                    key={o.level}
                    type="button"
                    className={`aq-pill ${o.level} ${priority === o.level ? 'on' : ''}`}
                    onClick={() =>
                      setPriorityLevel(priority === o.level ? null : o.level)
                    }
                  >
                    <span className="pdot" />
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="aq-field">
              <label htmlFor="aq-lang">Code language hint</label>
              <AqSelect
                id="aq-lang"
                value={lang}
                onChange={setLang}
                options={LANG_OPTIONS.map((l) => ({ value: l, label: l }))}
              />
            </div>
          </div>

          <div className="aq-field">
            <label htmlFor="aq-tags">
              Tags{' '}
              <span className="aq-customize-sub">
                (optional, comma-separated)
              </span>
            </label>
            <input
              id="aq-tags"
              className="aq-input"
              type="text"
              placeholder="closures, scope, es6"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          <div className="aq-field">
            <label>Answer {isImpl ? '(code only)' : '(Markdown)'}</label>
            <MarkdownField
              tab={tab}
              onTabChange={setTab}
              value={markdown}
              onChange={handleMarkdownChange}
              readOnly={answerGen.state === 'loading'}
              textareaClassName={
                answerGen.state === 'loading' ? 'aq-gen-active' : ''
              }
              placeholder={
                isImpl
                  ? 'Paste or write the solution code here — wrap it in a fenced code block, e.g. ```jsx ... ```. Keep this to code only; the problem statement above already covers the explanation. Or click Generate answer above to draft one.'
                  : 'Write the answer in Markdown — any heading (#, ##, ###) renders as the app’s answer heading style, plus **bold**, `code`, lists, ```code blocks```, and tables. Or click Generate answer above to draft one from your question.'
              }
              emptyPreviewText="Live preview appears here as you type…"
              toolbar={
                <div className="aq-gen-controls">
                  <button
                    type="button"
                    className={`aq-customize-btn ${instructions.trim() ? 'has-value' : ''}`}
                    onClick={() => setShowInstructions(true)}
                    title={`Instructions — model: ${AQ_MODELS.find((m) => m.id === model)?.label ?? model}`}
                  >
                    <SlidersHorizontal size={14} />
                    {instructions.trim() ? (
                      <span className="aq-customize-dot" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    className="aq-format-btn"
                    onClick={answerGen.format}
                    disabled={!canFormat}
                    title={
                      canFormat
                        ? "Reformat the text below into the app's markdown answer style — keeps your content as-is"
                        : 'Write or paste an answer below first'
                    }
                  >
                    <AlignLeft size={13} /> Format
                  </button>
                  <button
                    type="button"
                    className={`aq-generate-btn ${answerGen.state === 'loading' ? 'loading' : ''}`}
                    onClick={answerGen.generate}
                    disabled={!canGenerate}
                    title={
                      canGenerate
                        ? 'Generate an answer from the question above'
                        : 'Add a question above first'
                    }
                  >
                    {answerGen.state === 'loading' ? (
                      <>
                        <span className="aq-gen-spinner" />
                        Generating…
                      </>
                    ) : answerGen.state === 'done' ||
                      answerGen.state === 'error' ||
                      answerGen.state === 'limited' ? (
                      <>
                        <RefreshCw size={12.5} /> Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles size={12.5} /> Generate answer
                      </>
                    )}
                  </button>
                </div>
              }
              belowTabs={
                <>
                  {answerVersions.length >= 1 && (
                    <div className="aq-version-row">
                      <span className="aq-version-label">Drafts:</span>
                      {answerVersions.map((v) => (
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
                  {answerGen.state === 'error' && answerGen.error && (
                    <div className="aq-gen-error">{answerGen.error}</div>
                  )}
                  {answerGen.state === 'limited' && (
                    <div className="aq-gen-error">
                      {AQ_MODELS.find((m) => m.id === model)?.label ??
                        'This model'}{' '}
                      looks rate-limited — open Instructions to switch models,
                      or try again shortly.
                    </div>
                  )}
                </>
              }
              afterPanes={
                answerGen.state === 'done' && (
                  <div className="aq-gen-note">
                    <Sparkles size={11} />
                    AI-drafted — review before saving.
                  </div>
                )
              }
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
          <span className="aq-foot-left">{footNote}</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button
              className={`btn-primary btn-save ${saving ? 'saving' : ''}`}
              disabled={!canSave}
              onClick={handleSave}
            >
              {saving ? <Loader2 size={14} className="aq-spin" /> : null}
              {saving ? 'Saving…' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
