import type { StateCreator } from 'zustand';
import { selectPlacement } from './placementSlice';
import {
  AUTO_STEPS,
  type AutoRunSlice,
  type AutoStep,
  type AuthoringInit,
  type AuthoringState,
} from './types';

export const createAutoRunSlice = (
  init: AuthoringInit,
): StateCreator<AuthoringState, [], [], AutoRunSlice> => {
  return (set, get, store) => {
    // AI results reach their field through the typewriter, which finishes well
    // after the action resolves — so a step isn't done until `stream` clears.
    const typed = () => {
      return new Promise<void>((resolve) => {
        if (!get().stream) return resolve();
        const unsubscribe = store.subscribe((s) => {
          if (s.stream) return;
          unsubscribe();
          resolve();
        });
      });
    };

    // Switching to manual abandons the chain mid-flight, and an abandoned one
    // must stop writing into fields the author is now editing.
    let run = 0;
    const stale = (mine: number) => mine !== run;

    // The duplicate check only earns its place when there's a captured item
    // being filed into a subtopic; editing a saved question runs three.
    const steps: readonly AutoStep[] = init.fromInbox
      ? AUTO_STEPS
      : AUTO_STEPS.filter((s) => s !== 'duplicate');

    // A step that fails doesn't stop the run: the field keeps whatever it had
    // and shows its own error, which is visible because the form never left
    // the screen. Only a flagged duplicate actually halts the pipeline.
    const runFrom = async (from: number): Promise<void> => {
      const mine = ++run;
      set({ autoStatus: 'running' });

      for (let i = from; i < steps.length; i++) {
        set({ autoStep: i });
        const s = get();

        if (steps[i] === 'question') {
          await s.generateQuestion();
          await typed();
        } else if (steps[i] === 'placement') {
          await s.suggestPlacement();
          if (get().suggestState !== 'error') get().acceptSuggestion();
        } else if (steps[i] === 'duplicate') {
          // A staged subtopic has no questions filed under it yet, so there
          // is nothing to compare against — same guard the manual button uses.
          if (!selectPlacement(get()).isPendingSection) {
            await s.checkDuplicate();
            if (stale(mine)) return;
            if (get().dupResult?.isDuplicate) {
              return set({ autoStatus: 'paused' });
            }
          }
        } else {
          await s.generateAnswer();
          await typed();
        }

        if (stale(mine)) return;
      }

      set({ autoStatus: 'done' });
    };

    return {
      autoSteps: steps,
      autoStep: 0,
      autoStatus: init.autoRun ? 'running' : 'idle',

      startAuto: () => runFrom(0),
      // "Switch to manual" — hides the banner and abandons whatever is left.
      dismissAuto: () => {
        run++;
        set({ autoStatus: 'idle' });
      },
      // Resumes past a duplicate the author chose to keep.
      keepAsNew: () => runFrom(steps.indexOf('duplicate') + 1),
    };
  };
};
