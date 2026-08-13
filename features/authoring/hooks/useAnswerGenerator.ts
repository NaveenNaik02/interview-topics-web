import { useState } from 'react';
import { generateAnswer } from '@/lib/actions/generateAnswer';
import { formatAnswer } from '@/lib/actions/formatAnswer';
import type { AqModelId } from '@/lib/aiModels';

const isRateLimited = (msg: string) =>
  /rate|quota|limit|429|overloaded|exhausted|unavailable/i.test(msg);

interface Params {
  question: string;
  markdown: string;
  topicName: string;
  sectionLabel: string;
  instructions: string;
  isImpl: boolean;
  lang: string;
  model: AqModelId;
  typewrite: (text: string, onDone: () => void) => void;
  setTab: (tab: 'write' | 'preview') => void;
  snapshotCurrentAnswer: () => void;
  addAnswerVersion: (text: string) => void;
}

// Writes the answer field: generate one from scratch, or reformat what's
// already there. Both stay here because they share one state machine — a
// rate-limited model is reported separately from a real failure so the UI can
// suggest switching models instead of just retrying.
export const useAnswerGenerator = (p: Params) => {
  const [state, setState] = useState<
    'idle' | 'loading' | 'done' | 'error' | 'limited'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  // Snapshot the current draft so it stays recoverable, switch to Write so
  // the typewriter is visible, then stream the result in and record it as a
  // draft. Only the request differs between the two actions.
  const run = async (request: () => Promise<string>) => {
    p.snapshotCurrentAnswer();
    setState('loading');
    setError(null);
    p.setTab('write');
    try {
      const text = await request();
      p.typewrite(text, () => {
        setState('done');
        p.addAnswerVersion(text);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setState(isRateLimited(msg) ? 'limited' : 'error');
      setError(msg);
    }
  };

  return {
    state,
    error,
    generate: () =>
      run(() =>
        generateAnswer({
          question: p.question,
          topicName: p.topicName,
          subName: p.sectionLabel,
          instructions: p.instructions,
          model: p.model,
        }),
      ),
    format: () =>
      run(() =>
        formatAnswer({
          text: p.markdown,
          question: p.question,
          instructions: p.instructions,
          isImpl: p.isImpl,
          lang: p.lang,
          model: p.model,
        }),
      ),
  };
};
