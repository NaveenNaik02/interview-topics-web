import { useState } from 'react';
import {
  checkDuplicateQuestion,
  type DuplicateCheckResult,
} from '@/lib/actions/checkDuplicate';
import type { SectionMeta } from '@/lib/topics';
import type { AqModelId } from '@/lib/aiModels';

interface Params {
  title: string;
  section?: SectionMeta;
  // Never flagged as a duplicate of itself when re-checking an existing one.
  excludeId?: string;
  model: AqModelId;
}

// Compares the question against the ones already filed in the selected
// subtopic.
export const useDuplicateCheck = (p: Params) => {
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>(
    'idle',
  );
  const [result, setResult] = useState<DuplicateCheckResult | null>(null);

  const check = async () => {
    if (!p.section) return;
    setState('loading');
    setResult(null);
    try {
      setResult(
        await checkDuplicateQuestion({
          title: p.title,
          topic: p.section.topic,
          file: p.section.file,
          excludeId: p.excludeId,
          model: p.model,
        }),
      );
      setState('done');
    } catch {
      setState('error');
    }
  };

  // A result is only valid for the subtopic it ran against — changing the
  // placement invalidates it without needing a re-check.
  const reset = () => {
    setState('idle');
    setResult(null);
  };

  return { state, result, check, reset };
};

export type DuplicateCheck = ReturnType<typeof useDuplicateCheck>;
