import { useState } from 'react';
import { generateProblem } from '@/lib/actions/generateProblem';
import { getProblemInstructionText } from '@/lib/instructionPresets';
import type { AqModelId } from '@/lib/aiModels';

interface Params {
  question: string;
  lang: string;
  tags: string;
  model: AqModelId;
  typewriteProblem: (text: string, onDone: () => void) => void;
}

// Drafts the problem statement for an implementation question.
export const useProblemGenerator = (p: Params) => {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const generate = async () => {
    setState('loading');
    try {
      const text = await generateProblem({
        question: p.question,
        lang: p.lang,
        tags: p.tags,
        model: p.model,
        instructions: getProblemInstructionText(),
      });
      p.typewriteProblem(text, () => setState('idle'));
    } catch {
      setState('error');
    }
  };

  return { state, generate };
};
