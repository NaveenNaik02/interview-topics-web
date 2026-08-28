'use client';

import { AlertTriangle, Check } from 'lucide-react';
import { useAuthoring } from '../store/authoringStore';
import type { AutoStep } from '../store/types';

const LABELS: Record<AutoStep, string> = {
  question: 'Regenerate question',
  placement: 'Suggest placement',
  duplicate: 'Check duplicates',
  answer: 'Draft answer',
};

const STATUS_TEXT = {
  running: 'Automating… nothing is saved yet.',
  paused: 'Paused on a possible duplicate — decide below to continue.',
  done: 'Done — review the fields below, then save.',
  partial: 'Done, but some steps didn’t go through — check the fields below.',
};

// A strip across the top of the form while auto-run drives it. The form stays
// on screen and keeps filling in underneath, so this only has to say which
// step is running — the fields themselves show the results and any errors.
export const AutoRunBanner = () => {
  const steps = useAuthoring((s) => s.autoSteps);
  const current = useAuthoring((s) => s.autoStep);
  const status = useAuthoring((s) => s.autoStatus);
  const dismissAuto = useAuthoring((s) => s.dismissAuto);
  // A step that failed left its own error next to the field it was meant to
  // fill. Reading those back here keeps the banner from claiming a green run
  // over a field the model never actually wrote. Selected one at a time — a
  // selector returning a fresh object never matches its previous snapshot.
  const questionFailed = useAuthoring((s) => s.questionState === 'error');
  const placementFailed = useAuthoring((s) => s.suggestState === 'error');
  const duplicateFailed = useAuthoring((s) => s.dupState === 'error');
  const answerFailed = useAuthoring((s) => {
    return s.answerState === 'error' || s.answerState === 'limited';
  });

  if (status === 'idle') return null;

  const failed: Record<AutoStep, boolean> = {
    question: questionFailed,
    placement: placementFailed,
    duplicate: duplicateFailed,
    answer: answerFailed,
  };

  const anyFailed = steps.some((step) => failed[step]);
  const tone = status === 'done' && anyFailed ? 'partial' : status;

  return (
    <div className={`aq-auto-banner ${tone}`}>
      <div className="aq-auto-steps">
        {steps.map((step, i) => {
          const reached = status === 'done' || i < current;
          const active = status === 'running' && i === current;
          const state = reached
            ? failed[step]
              ? 'failed'
              : 'done'
            : active
              ? 'active'
              : '';
          return (
            <div key={step} className={`aq-auto-step ${state}`}>
              <span className="aq-auto-dot">
                {state === 'failed' ? (
                  <AlertTriangle size={10} />
                ) : state === 'done' ? (
                  <Check size={10} />
                ) : active ? (
                  <span className="aq-gen-spinner" />
                ) : (
                  i + 1
                )}
              </span>
              <span className="aq-auto-label">{LABELS[step]}</span>
            </div>
          );
        })}
      </div>
      <div className="aq-auto-status-row">
        <span className="aq-auto-status-text">{STATUS_TEXT[tone]}</span>
        <button
          type="button"
          className="aq-auto-manual-btn"
          onClick={dismissAuto}
        >
          Switch to manual
        </button>
      </div>
    </div>
  );
};
