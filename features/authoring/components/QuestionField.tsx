'use client';

import { useEffect, type RefObject } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTypewriter } from '@/lib/useTypewriter';
import type { AqModelId } from '@/lib/aiModels';
import { useQuestionGenerator } from '../hooks/useQuestionGenerator';
import { useProblemGenerator } from '../hooks/useProblemGenerator';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import type { Placement } from '../hooks/usePlacement';

interface Props {
  value: string;
  onChange: (value: string) => void;
  inputRef: RefObject<HTMLInputElement | null>;
  // The question as it was saved. Present only when editing — that's what
  // makes "Revert to original" available.
  originalTitle?: string;
  placement: Placement;
  // An implementation question swaps the plain answer for a Problem →
  // Solution layout, so the problem statement is edited here alongside the
  // question it belongs to.
  isImpl: boolean;
  onImplChange: (isImpl: boolean) => void;
  problem: string;
  onProblemChange: (problem: string) => void;
  // Form state the AI actions below need for their requests.
  lang: string;
  tags: string;
  model: AqModelId;
  excludeQuestionId?: string;
}

// The Question field: the text itself, the three actions that write or verify
// it (generate, revert, check for duplicates), and everything those actions
// report back.
export const QuestionField = ({
  value,
  onChange,
  inputRef,
  originalTitle,
  placement,
  isImpl,
  onImplChange,
  problem,
  onProblemChange,
  lang,
  tags,
  model,
  excludeQuestionId,
}: Props) => {
  const typewriteQuestion = useTypewriter(onChange);
  const questionGen = useQuestionGenerator({
    topicName: placement.activeTopicName,
    sectionLabel: placement.activeSectionLabel,
    seed: value,
    isImpl,
    lang,
    tags,
    model,
    typewriteQuestion,
  });

  const dupCheck = useDuplicateCheck({
    title: value,
    section: placement.section,
    excludeId: excludeQuestionId,
    model,
  });

  // A duplicate check is only valid for the topic/subtopic it ran against —
  // picking a different one invalidates the result without needing a re-check.
  useEffect(() => {
    dupCheck.reset();
  }, [placement.groupSlug, placement.sectionK]); // eslint-disable-line react-hooks/exhaustive-deps

  const typewriteProblem = useTypewriter(onProblemChange);
  const problemGen = useProblemGenerator({
    question: value,
    lang,
    tags,
    model,
    typewriteProblem,
  });

  const canRevert = !!originalTitle && value !== originalTitle;
  const canGenerateProblem =
    value.trim().length > 3 && problemGen.state !== 'loading';
  // Needs a question to compare, and a subtopic that actually exists — a
  // staged one has nothing filed under it yet.
  const canCheckDuplicate =
    value.trim().length > 3 &&
    dupCheck.state !== 'loading' &&
    !!placement.section &&
    !placement.isPendingSection;
  const { result } = dupCheck;

  return (
    <>
      <div className="aq-field">
        <div className="aq-label-row">
          <label htmlFor="aq-question">Question</label>
          <div className="aq-label-actions">
            <button
              type="button"
              className={`aq-generate-btn ${questionGen.state === 'loading' ? 'loading' : ''}`}
              onClick={questionGen.generate}
              disabled={questionGen.state === 'loading'}
              title={
                value.trim()
                  ? 'Generate a fresh question, using your text above as a rough idea'
                  : 'Generate a question for this topic/subtopic'
              }
            >
              {questionGen.state === 'loading' ? (
                <>
                  <span className="aq-gen-spinner" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={12.5} />{' '}
                  {value.trim() ? 'Regenerate' : 'Generate question'}
                </>
              )}
            </button>
            {canRevert && (
              <button
                type="button"
                className="aq-generate-btn aq-revert-btn"
                onClick={() => onChange(originalTitle!)}
                title="Restore the original saved question text"
              >
                <RefreshCw size={12.5} /> Revert to original
              </button>
            )}
            <button
              type="button"
              className={`aq-generate-btn ${dupCheck.state === 'loading' ? 'loading' : ''}`}
              onClick={dupCheck.check}
              disabled={!canCheckDuplicate}
              title="Check this question against existing ones in the selected subtopic"
            >
              {dupCheck.state === 'loading' ? (
                <>
                  <span className="aq-gen-spinner" />
                  Checking…
                </>
              ) : (
                <>
                  <Sparkles size={12.5} /> Check for duplicates
                </>
              )}
            </button>
          </div>
        </div>

        <input
          id="aq-question"
          ref={inputRef}
          className="aq-input"
          type="text"
          placeholder="e.g. What is the difference between let, const, and var?"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        {questionGen.state === 'error' && (
          <div className="aq-gen-error">
            Couldn&apos;t generate a question — try again.
          </div>
        )}
        {dupCheck.state === 'error' && (
          <div className="aq-gen-error">
            Couldn&apos;t check for duplicates — try again.
          </div>
        )}
        {dupCheck.state === 'done' && result && (
          <div
            className={`aq-dup-card ${result.isDuplicate ? 'is-dup' : 'is-clear'}`}
          >
            <div className="aq-dup-head">
              {result.isDuplicate ? (
                <AlertTriangle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              <span>
                {result.isDuplicate
                  ? 'Possible duplicate found'
                  : 'No duplicate found'}
              </span>
            </div>
            {result.match && (
              <>
                <span className="aq-dup-label">Matched question</span>
                <p className="aq-dup-match">&ldquo;{result.match}&rdquo;</p>
              </>
            )}
            {result.reasoning && (
              <p className="aq-suggest-reason">{result.reasoning}</p>
            )}
          </div>
        )}
      </div>

      <div className="aq-field">
        <div className="aq-impl-toggle-row">
          <label className="aq-toggle">
            <input
              type="checkbox"
              checked={isImpl}
              onChange={(e) => onImplChange(e.target.checked)}
            />
            <span className="aq-toggle-track">
              <span className="aq-toggle-thumb" />
            </span>
          </label>
          <div className="aq-impl-toggle-copy">
            <span className="aq-impl-toggle-title">
              Implementation question
            </span>
            <span className="aq-impl-toggle-sub">
              Shows a Problem → Solution layout instead of a plain answer
            </span>
          </div>
        </div>
        {isImpl && (
          <>
            <div className="aq-problem-gen-row">
              <button
                type="button"
                className={`aq-generate-btn ${problemGen.state === 'loading' ? 'loading' : ''}`}
                onClick={problemGen.generate}
                disabled={!canGenerateProblem}
                title={
                  canGenerateProblem
                    ? 'Generate a problem statement from the question above'
                    : 'Add a question above first'
                }
              >
                {problemGen.state === 'loading' ? (
                  <>
                    <span className="aq-gen-spinner" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles size={12.5} /> Generate
                  </>
                )}
              </button>
            </div>
            <textarea
              className="aq-input aq-problem-input"
              rows={3}
              placeholder="Describe what needs to be implemented — e.g. Write flatten(arr, depth) that flattens nested arrays up to depth levels…"
              value={problem}
              onChange={(e) => onProblemChange(e.target.value)}
            />
            {problemGen.state === 'error' && (
              <div className="aq-gen-error">
                Couldn&apos;t generate — try again.
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
};
