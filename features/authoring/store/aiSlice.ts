import type { StateCreator } from 'zustand';
import { generateQuestion } from '@/lib/ai/generateQuestion';
import { generateProblem } from '@/lib/ai/generateProblem';
import { generateAnswer } from '@/lib/ai/generateAnswer';
import { formatAnswer } from '@/lib/ai/formatAnswer';
import { checkDuplicateQuestion } from '@/lib/ai/checkDuplicate';
import { suggestPlacement } from '@/lib/ai/suggestPlacement';
import {
  getSuggestionInstructionText,
  getProblemInstructionText,
} from '@/lib/instructionPresets';
import { AUTO_RUN_MODEL } from '@/lib/ai/models';
import { PENDING_GROUP_SLUG, PENDING_SECTION_KEY } from '../types';
import { selectPlacement } from './placementSlice';
import type { AiSlice, AuthoringState } from './types';

const isRateLimited = (msg: string) => {
  return /rate|quota|limit|429|overloaded|exhausted|unavailable/i.test(msg);
};

// The picker's choice, except while auto-run is driving — see AUTO_RUN_MODEL.
// Leaves the saved preference alone; only this run's requests are redirected.
const modelFor = (s: AuthoringState) => {
  return s.autoStatus === 'running' ? AUTO_RUN_MODEL : s.model;
};

export const createAiSlice: StateCreator<AuthoringState, [], [], AiSlice> = (
  set,
  get,
) => {
  let token = 0;
  const stream = (target: 'title' | 'markdown' | 'problem', text: string) => {
    set({ stream: { target, text, token: ++token } });
  };

  return {
    questionState: 'idle',
    problemState: 'idle',
    answerState: 'idle',
    answerError: null,
    dupState: 'idle',
    dupResult: null,
    suggestState: 'idle',
    suggestion: null,
    stream: null,

    generateQuestion: async () => {
      const s = get();
      const { activeTopicName, activeSectionLabel } = selectPlacement(s);
      set({ questionState: 'loading' });
      try {
        stream(
          'title',
          await generateQuestion({
            topicName: activeTopicName,
            subName: activeSectionLabel,
            seed: s.title,
            isImpl: s.isImpl,
            lang: s.lang,
            tags: s.tags,
            model: modelFor(s),
            instructions: getSuggestionInstructionText(),
          }),
        );
      } catch {
        set({ questionState: 'error' });
      }
    },

    generateProblem: async () => {
      const s = get();
      set({ problemState: 'loading' });
      try {
        stream(
          'problem',
          await generateProblem({
            question: s.title,
            lang: s.lang,
            tags: s.tags,
            model: modelFor(s),
            instructions: getProblemInstructionText(),
          }),
        );
      } catch {
        set({ problemState: 'error' });
      }
    },

    // Both answer actions share one flow: snapshot the current draft so it
    // stays recoverable, switch to Write so the typewriter is visible, then
    // park the result for the bridge. Only the request differs.
    generateAnswer: async () => {
      const s = get();
      const { activeTopicName, activeSectionLabel } = selectPlacement(s);
      s.snapshotAnswer();
      set({ answerState: 'loading', answerError: null, tab: 'write' });
      try {
        stream(
          'markdown',
          await generateAnswer({
            question: s.title,
            topicName: activeTopicName,
            subName: activeSectionLabel,
            instructions: s.instructions,
            wantCodeExample: !s.isImpl && s.wantCodeExample,
            model: modelFor(s),
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          answerState: isRateLimited(msg) ? 'limited' : 'error',
          answerError: msg,
        });
      }
    },

    formatAnswer: async () => {
      const s = get();
      s.snapshotAnswer();
      set({ answerState: 'loading', answerError: null, tab: 'write' });
      try {
        stream(
          'markdown',
          await formatAnswer({
            text: s.markdown,
            question: s.title,
            instructions: s.instructions,
            wantCodeExample: !s.isImpl && s.wantCodeExample,
            isImpl: s.isImpl,
            lang: s.lang,
            model: modelFor(s),
          }),
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        set({
          answerState: isRateLimited(msg) ? 'limited' : 'error',
          answerError: msg,
        });
      }
    },

    checkDuplicate: async () => {
      const s = get();
      const { section } = selectPlacement(s);
      if (!section) return;
      set({ dupState: 'loading', dupResult: null });
      try {
        set({
          dupResult: await checkDuplicateQuestion({
            title: s.title,
            topic: section.topic,
            file: section.file,
            excludeId: s.excludeQuestionId,
            model: modelFor(s),
          }),
          dupState: 'done',
        });
      } catch {
        set({ dupState: 'error' });
      }
    },

    // A result is only valid for the subtopic it ran against, so changing the
    // placement clears it (see setGroupSlug/setSectionK).
    resetDuplicate: () => set({ dupState: 'idle', dupResult: null }),

    suggestPlacement: async () => {
      const s = get();
      set({ suggestState: 'loading', suggestion: null });
      try {
        set({
          suggestion: await suggestPlacement({
            title: s.title,
            tags: s.tags,
            groups: s.groups.map((g) => ({
              groupSlug: g.slug,
              groupName: g.groupName,
              sections: g.sections,
            })),
            model: modelFor(s),
          }),
          suggestState: 'idle',
        });
      } catch {
        set({ suggestState: 'error' });
      }
    },

    // Accepting always clears the suggestion — the card's job is done once
    // the pickers reflect it.
    acceptSuggestion: () => {
      const s = get().suggestion;
      if (!s) return;
      set({ suggestion: null });
      if (s.mode === 'existing') {
        set({
          pending: null,
          groupSlug: s.groupSlug,
          sectionK: `${s.topic}/${s.file}`,
        });
      } else {
        set({
          pending: s,
          groupSlug: s.mode === 'new-topic' ? PENDING_GROUP_SLUG : s.groupSlug,
          sectionK: PENDING_SECTION_KEY,
        });
      }
      get().resetDuplicate();
    },

    dismissSuggestion: () => set({ suggestion: null }),

    // Called by the typewriter bridge once the text has finished playing in.
    finishStream: () => {
      const s = get().stream;
      if (!s) return;
      if (s.target === 'title') set({ questionState: 'idle' });
      else if (s.target === 'problem') set({ problemState: 'idle' });
      else {
        set({ answerState: 'done' });
        get().addAnswerVersion(s.text);
      }
      set({ stream: null });
    },
  };
};
