import type { StateCreator } from 'zustand';
import { getSavedModel } from '@/lib/ai/models';
import { getActiveInstructionText } from '@/lib/instructionPresets';
import { capAnswerVersions } from '../utils/markdownPreview';
import type { AuthoringInit, AuthoringState, DraftSlice } from './types';

export const createDraftSlice = (
  init: AuthoringInit,
): StateCreator<AuthoringState, [], [], DraftSlice> => {
  return (set, get) => {
    const isImpl = !!init.initial?.problem;
    const originalMarkdown = init.original?.markdown ?? '';

    return {
      title: init.initial?.title ?? '',
      markdown: init.initial?.markdown ?? '',
      problem: init.initial?.problem ?? '',
      tags: init.initial?.tags ?? '',
      lang: init.initial?.lang || 'js',
      // `null` is a real choice ("no priority"), so only an absent priority
      // falls back to the user's default.
      priority:
        init.initial?.priority === undefined
          ? init.defaultPriority
          : init.initial.priority,
      isImpl,
      wantCodeExample: false,
      tab: 'write',
      // Seeded from the built-in default matching isImpl (text vs. code-only).
      // Edits here are this question's local draft and never persist.
      instructions: getActiveInstructionText(isImpl),
      model: getSavedModel(),
      showInstructions: false,
      saving: false,
      saveError: null,
      answerVersions: originalMarkdown.trim()
        ? [{ id: 'original', label: 'Original', text: originalMarkdown }]
        : [],
      activeVersionId: originalMarkdown.trim() ? 'original' : null,
      draftCount: 0,

      setTitle: (title) => set({ title }),
      setMarkdown: (markdown) => set({ markdown }),
      setProblem: (problem) => set({ problem }),
      setTags: (tags) => set({ tags }),
      setLang: (lang) => set({ lang }),
      setPriority: (priority) => set({ priority }),
      setIsImpl: (isImpl) => set({ isImpl }),
      setWantCodeExample: (wantCodeExample) => set({ wantCodeExample }),
      setTab: (tab) => set({ tab }),
      setInstructions: (instructions) => set({ instructions }),
      setShowInstructions: (showInstructions) => set({ showInstructions }),

      editMarkdown: (markdown) => set({ markdown, activeVersionId: null }),
      selectVersion: (v) => set({ markdown: v.text, activeVersionId: v.id }),

      snapshotAnswer: () => {
        const { markdown, answerVersions, activeVersionId, draftCount } = get();
        if (!markdown.trim()) return;
        const last = answerVersions[answerVersions.length - 1];
        if (last?.text === markdown) return;
        const label =
          activeVersionId === 'original'
            ? 'Original'
            : answerVersions.find((v) => v.id === activeVersionId)?.label;
        if (label && answerVersions.some((v) => v.text === markdown)) return;
        set({
          draftCount: draftCount + 1,
          answerVersions: capAnswerVersions([
            ...answerVersions,
            {
              id: `v${Date.now()}`,
              label: label ?? `Draft ${draftCount + 1}`,
              text: markdown,
            },
          ]),
        });
      },

      addAnswerVersion: (text) => {
        const { answerVersions, draftCount } = get();
        const id = `v${Date.now()}`;
        set({
          draftCount: draftCount + 1,
          activeVersionId: id,
          answerVersions: capAnswerVersions([
            ...answerVersions,
            { id, label: `Draft ${draftCount + 1}`, text },
          ]),
        });
      },

      save: async () => {
        const s = get();
        // The button is disabled while saving, but guard anyway — a second
        // call would create a duplicate question, not just a wasted request.
        if (s.saving) return;
        set({ saving: true, saveError: null });
        try {
          const section = await s.resolveTargetSection();
          await s.onSubmit(
            {
              topic: section.topic,
              file: section.file,
              title: s.title,
              markdown: s.markdown,
              lang: s.lang,
              tags: s.tags,
              problem: s.isImpl ? s.problem : '',
              priority: s.priority,
            },
            section,
          );
        } catch (err) {
          set({
            saving: false,
            saveError:
              err instanceof Error
                ? err.message
                : 'Could not save this question — try again.',
          });
        }
      },
    };
  };
};
