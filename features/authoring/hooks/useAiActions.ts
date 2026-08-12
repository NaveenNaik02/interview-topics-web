import { useState } from 'react';
import { generateAnswer } from '@/lib/actions/generateAnswer';
import { generateQuestion } from '@/lib/actions/generateQuestion';
import { generateProblem } from '@/lib/actions/generateProblem';
import { formatAnswer } from '@/lib/actions/formatAnswer';
import {
  checkDuplicateQuestion,
  type DuplicateCheckResult,
} from '@/lib/actions/checkDuplicate';
import type { SectionMeta } from '@/lib/topics';
import type { AqModelId } from '@/lib/aiModels';
import {
  getSuggestionInstructionText,
  getProblemInstructionText,
} from '@/lib/instructionPresets';

const isRateLimited = (msg: string) =>
  /rate|quota|limit|429|overloaded|exhausted|unavailable/i.test(msg);

interface Params {
  title: string;
  markdown: string;
  activeTopicName: string;
  activeSectionLabel: string;
  isImpl: boolean;
  lang: string;
  tags: string;
  model: AqModelId;
  instructions: string;
  section?: SectionMeta;
  // Never flagged as a duplicate of itself when re-checking an existing one.
  excludeId?: string;
  typewrite: (text: string, onDone: () => void) => void;
  typewriteQuestion: (text: string, onDone: () => void) => void;
  typewriteProblem: (text: string, onDone: () => void) => void;
  setTab: (tab: 'write' | 'preview') => void;
  snapshotCurrentAnswer: () => void;
  addAnswerVersion: (text: string) => void;
}

// Gemini-backed actions on the question's *content* (question/problem/answer
// generation, formatting, duplicate check) — they share the same
// request/loading/error shape and are pure business logic, so the component
// only wires their returned state to buttons. Placement suggestion is not
// here: it belongs to usePlacement, which owns the state it writes to.
export function useAiActions(p: Params) {
  const [genState, setGenState] = useState<
    'idle' | 'loading' | 'done' | 'error' | 'limited'
  >('idle');
  const [genError, setGenError] = useState<string | null>(null);
  const [questionGen, setQuestionGen] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const [problemGen, setProblemGen] = useState<'idle' | 'loading' | 'error'>(
    'idle',
  );
  const [dupState, setDupState] = useState<
    'idle' | 'loading' | 'done' | 'error'
  >('idle');
  const [dupResult, setDupResult] = useState<DuplicateCheckResult | null>(null);

  const handleGenerateQuestion = async () => {
    setQuestionGen('loading');
    try {
      const text = await generateQuestion({
        topicName: p.activeTopicName,
        subName: p.activeSectionLabel,
        seed: p.title,
        isImpl: p.isImpl,
        lang: p.lang,
        tags: p.tags,
        model: p.model,
        instructions: getSuggestionInstructionText(),
      });
      p.typewriteQuestion(text, () => setQuestionGen('idle'));
    } catch (err) {
      setQuestionGen('error');
      setGenError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleGenerateProblem = async () => {
    setProblemGen('loading');
    try {
      const text = await generateProblem({
        question: p.title,
        lang: p.lang,
        tags: p.tags,
        model: p.model,
        instructions: getProblemInstructionText(),
      });
      p.typewriteProblem(text, () => setProblemGen('idle'));
    } catch {
      setProblemGen('error');
    }
  };

  const handleGenerate = async () => {
    p.snapshotCurrentAnswer();
    setGenState('loading');
    setGenError(null);
    p.setTab('write');
    try {
      const text = await generateAnswer({
        question: p.title,
        topicName: p.activeTopicName,
        subName: p.activeSectionLabel,
        instructions: p.instructions,
        model: p.model,
      });
      p.typewrite(text, () => {
        setGenState('done');
        p.addAnswerVersion(text);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenState(isRateLimited(msg) ? 'limited' : 'error');
      setGenError(msg);
    }
  };

  const handleFormat = async () => {
    p.snapshotCurrentAnswer();
    setGenState('loading');
    setGenError(null);
    p.setTab('write');
    try {
      const text = await formatAnswer({
        text: p.markdown,
        question: p.title,
        instructions: p.instructions,
        isImpl: p.isImpl,
        lang: p.lang,
        model: p.model,
      });
      p.typewrite(text, () => {
        setGenState('done');
        p.addAnswerVersion(text);
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setGenState(isRateLimited(msg) ? 'limited' : 'error');
      setGenError(msg);
    }
  };

  const handleCheckDuplicate = async () => {
    if (!p.section) return;
    setDupState('loading');
    setDupResult(null);
    try {
      const result = await checkDuplicateQuestion({
        title: p.title,
        topic: p.section.topic,
        file: p.section.file,
        excludeId: p.excludeId,
        model: p.model,
      });
      setDupResult(result);
      setDupState('done');
    } catch {
      setDupState('error');
    }
  };

  return {
    genState,
    genError,
    questionGen,
    problemGen,
    dupState,
    dupResult,
    setDupState,
    setDupResult,
    handleGenerateQuestion,
    handleGenerateProblem,
    handleGenerate,
    handleFormat,
    handleCheckDuplicate,
  };
}
