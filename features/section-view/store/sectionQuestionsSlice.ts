import type { StateCreator } from 'zustand';
import type { AppState } from '@/lib/stores/types';
import type { SectionQuestionsSlice, PriorityFilterKey } from './types';
import {
  setStarred,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';

export const createSectionQuestionsSlice: StateCreator<
  AppState,
  [],
  [],
  SectionQuestionsSlice
> = (set, get) => ({
  sectionQuestions: [],
  sectionQuestionsCache: {},
  activeSectionUrl: null,
  filterSet: new Set<PriorityFilterKey>(),
  statusFilter: null,
  sortMode: 'manual',

  setSectionQuestions: (questions, section) => {
    const { rememberFilters, defaultSort, activeSectionUrl, sectionQuestionsCache, totals } = get();
    const currentUrl = `/${section.topic}/${section.file}`;

    const nextState: Partial<AppState> = {
      sectionQuestions: questions,
      sectionQuestionsCache: {
        ...sectionQuestionsCache,
        [currentUrl]: questions,
      },
      activeSectionUrl: currentUrl,
      totals: {
        ...totals,
        [currentUrl]: questions.length,
      },
    };

    // Reset filters if navigating to a different section and rememberFilters is false
    if (!rememberFilters || activeSectionUrl !== currentUrl) {
      nextState.filterSet = new Set<PriorityFilterKey>();
      nextState.statusFilter = null;
      nextState.sortMode = defaultSort;
    }

    set(nextState);
  },

  updateQuestionPriority: (id, level) => {
    const { sectionQuestions, activeSectionUrl, sectionQuestionsCache } = get();
    const updated = sectionQuestions.map((q) =>
      q.id === id ? { ...q, priority: level } : q
    );
    const nextState: Partial<SectionQuestionsSlice> = { sectionQuestions: updated };
    if (activeSectionUrl) {
      nextState.sectionQuestionsCache = {
        ...sectionQuestionsCache,
        [activeSectionUrl]: updated,
      };
    }
    set(nextState);

    setPriorityAction(id, level).catch((err) =>
      console.error('[priority] write failed:', err)
    );
  },

  toggleQuestionStarred: (id, wasStarred) => {
    const { sectionQuestions, activeSectionUrl, sectionQuestionsCache, bumpStarredCount } = get();
    const updated = sectionQuestions.map((q) =>
      q.id === id ? { ...q, starred: !wasStarred } : q
    );
    const nextState: Partial<SectionQuestionsSlice> = { sectionQuestions: updated };
    if (activeSectionUrl) {
      nextState.sectionQuestionsCache = {
        ...sectionQuestionsCache,
        [activeSectionUrl]: updated,
      };
    }
    set(nextState);
    bumpStarredCount(wasStarred ? -1 : 1);

    setStarred(id, !wasStarred).catch((err) =>
      console.error('[starred] write failed:', err)
    );
  },

  togglePriorityFilter: (key) => {
    set((state) => {
      const next = new Set(state.filterSet);
      if (next.has(key)) {
        next.delete(key);
      } else if (key === 'none') {
        next.clear();
        next.add('none');
      } else {
        next.delete('none');
        next.add(key);
      }
      return { filterSet: next };
    });
  },

  toggleStatusFilter: (v) => {
    set((state) => ({
      statusFilter: state.statusFilter === v ? null : v,
    }));
  },

  setSortMode: (mode) => {
    set({ sortMode: mode });
  },

  clearFilters: () => {
    set({
      filterSet: new Set<PriorityFilterKey>(),
      statusFilter: null,
    });
  },
});
