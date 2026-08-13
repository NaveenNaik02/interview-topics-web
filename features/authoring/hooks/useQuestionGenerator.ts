import { useState } from 'react';
import { generateQuestion } from '@/lib/actions/generateQuestion';
import { getSuggestionInstructionText } from '@/lib/instructionPresets';
import type { AqModelId } from '@/lib/aiModels';

interface Params {
  topicName: string;
  sectionLabel: string;
  // Whatever is in the Question field already, used as a rough idea to
  // rewrite rather than generating from nothing.
  seed: string;
  isImpl: boolean;
  lang: string;
  tags: string;
  model: AqModelId;
  typewriteQuestion: (text: string, onDone: () => void) => void;
}

// Drafts the question text itself.
export const useQuestionGenerator = (p: Params) => {
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle');

  const generate = async () => {
    setState('loading');
    try {
      const text = await generateQuestion({
        topicName: p.topicName,
        subName: p.sectionLabel,
        seed: p.seed,
        isImpl: p.isImpl,
        lang: p.lang,
        tags: p.tags,
        model: p.model,
        instructions: getSuggestionInstructionText(),
      });
      p.typewriteQuestion(text, () => setState('idle'));
    } catch {
      setState('error');
    }
  };

  return { state, generate };
};

export type QuestionGenerator = ReturnType<typeof useQuestionGenerator>;
