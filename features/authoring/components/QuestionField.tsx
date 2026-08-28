'use client';

import type { RefObject } from 'react';
import { Sparkles, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useAuthoring, usePlacementView } from '../store/authoringStore';

interface Props {
  // Autofocused on open, so the modal shell owns the ref.
  inputRef: RefObject<HTMLInputElement | null>;
}

// The question's definition: the text itself, the actions that write or
// verify it, whether it's an implementation question, and the problem
// statement that goes with one.
export const QuestionField = ({ inputRef }: Props) => {
  const { section, isPendingSection } = usePlacementView();
  const title = useAuthoring((s) => s.title);
  const setTitle = useAuthoring((s) => s.setTitle);
  const originalTitle = useAuthoring((s) => s.original?.title);
  const isImpl = useAuthoring((s) => s.isImpl);
  const setIsImpl = useAuthoring((s) => s.setIsImpl);
  const problem = useAuthoring((s) => s.problem);
  const setProblem = useAuthoring((s) => s.setProblem);
  const questionState = useAuthoring((s) => s.questionState);
  const generateQuestion = useAuthoring((s) => s.generateQuestion);
  const problemState = useAuthoring((s) => s.problemState);
  const generateProblem = useAuthoring((s) => s.generateProblem);
  const dupState = useAuthoring((s) => s.dupState);
  const dupResult = useAuthoring((s) => s.dupResult);
  const checkDuplicate = useAuthoring((s) => s.checkDuplicate);
  const autoStatus = useAuthoring((s) => s.autoStatus);
  const keepAsNew = useAuthoring((s) => s.keepAsNew);
  const onDiscard = useAuthoring((s) => s.onDiscard);

  const canRevert = !!originalTitle && title !== originalTitle;
  const canGenerateProblem =
    title.trim().length > 3 && problemState !== 'loading';
  // Needs a question to compare, and a subtopic that actually exists — a
  // staged one has nothing filed under it yet.
  const canCheckDuplicate =
    title.trim().length > 3 &&
    dupState !== 'loading' &&
    !!section &&
    !isPendingSection;

  return (
    <>
      <div className="aq-field">
        <div className="aq-label-row">
          <label htmlFor="aq-question">Question</label>
          <div className="aq-label-actions">
            <button
              type="button"
              className={`aq-generate-btn ${questionState === 'loading' ? 'loading' : ''}`}
              onClick={generateQuestion}
              disabled={questionState === 'loading'}
              title={
                title.trim()
                  ? 'Generate a fresh question, using your text above as a rough idea'
                  : 'Generate a question for this topic/subtopic'
              }
            >
              {questionState === 'loading' ? (
                <>
                  <span className="aq-gen-spinner" />
                  Generating…
                </>
              ) : (
                <>
                  <Sparkles size={12.5} />{' '}
                  {title.trim() ? 'Regenerate' : 'Generate question'}
                </>
              )}
            </button>
            {canRevert && (
              <button
                type="button"
                className="aq-generate-btn aq-revert-btn"
                onClick={() => setTitle(originalTitle!)}
                title="Restore the original saved question text"
              >
                <RefreshCw size={12.5} /> Revert to original
              </button>
            )}
            <button
              type="button"
              className={`aq-generate-btn ${dupState === 'loading' ? 'loading' : ''}`}
              onClick={checkDuplicate}
              disabled={!canCheckDuplicate}
              title="Check this question against existing ones in the selected subtopic"
            >
              {dupState === 'loading' ? (
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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {questionState === 'error' && (
          <div className="aq-gen-error">
            Couldn&apos;t generate a question — try again.
          </div>
        )}
        {dupState === 'error' && (
          <div className="aq-gen-error">
            Couldn&apos;t check for duplicates — try again.
          </div>
        )}
        {dupState === 'done' && dupResult && (
          <div
            className={`aq-dup-card ${dupResult.isDuplicate ? 'is-dup' : 'is-clear'}`}
          >
            <div className="aq-dup-head">
              {dupResult.isDuplicate ? (
                <AlertTriangle size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
              <span>
                {dupResult.isDuplicate
                  ? 'Possible duplicate found'
                  : 'No duplicate found'}
              </span>
            </div>
            {dupResult.match && (
              <>
                <span className="aq-dup-label">Matched question</span>
                <p className="aq-dup-match">&ldquo;{dupResult.match}&rdquo;</p>
              </>
            )}
            {dupResult.reasoning && (
              <p className="aq-suggest-reason">{dupResult.reasoning}</p>
            )}
            {/* Auto-run stops here rather than guessing; these two are how it
                gets going again. */}
            {autoStatus === 'paused' && dupResult.isDuplicate && (
              <div className="aq-dup-actions">
                <button
                  type="button"
                  className="aq-dup-action-btn"
                  onClick={keepAsNew}
                >
                  Keep as new, continue auto-run
                </button>
                {onDiscard && (
                  <button
                    type="button"
                    className="aq-dup-action-btn"
                    onClick={onDiscard}
                  >
                    Discard this item
                  </button>
                )}
              </div>
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
              onChange={(e) => setIsImpl(e.target.checked)}
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
                className={`aq-generate-btn ${problemState === 'loading' ? 'loading' : ''}`}
                onClick={generateProblem}
                disabled={!canGenerateProblem}
                title={
                  canGenerateProblem
                    ? 'Generate a problem statement from the question above'
                    : 'Add a question above first'
                }
              >
                {problemState === 'loading' ? (
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
              onChange={(e) => setProblem(e.target.value)}
            />
            {problemState === 'error' && (
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
