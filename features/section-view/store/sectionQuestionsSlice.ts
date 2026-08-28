import type { StateCreator } from 'zustand';
import type { AppState } from '@/lib/stores/types';
import type { SectionQuestionsSlice, PriorityFilterKey } from './types';
import {
  setStarred,
  setGreyZone,
  setPriority as setPriorityAction,
} from '@/lib/actions/questionFlags';
import type { ShortlistFlag } from '@/lib/db/shortlist';

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

    // Fresh server list — anything the local progress store still holds for
    // this section that isn't here anymore was deleted or set aside.
    get().pruneSectionProgress(
      section.topic,
      section.file,
      questions.map((q) => q.id)
    );
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
    toggleFlag(set, get, id, 'starred', !wasStarred);
  },

  toggleQuestionGreyZone: (id, wasGreyZone) => {
    toggleFlag(set, get, id, 'grey_zone', !wasGreyZone);
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

// Optimistic flip of one row flag in the section list (and its cache), plus
// the fire-and-forget write — the two flags differ only in which field,
// action and badge they touch.
function toggleFlag(
  set: (partial: Partial<SectionQuestionsSlice>) => void,
  get: () => AppState,
  id: string,
  flag: ShortlistFlag,
  on: boolean,
) {
  const { sectionQuestions, activeSectionUrl, sectionQuestionsCache, bumpFlagCount } = get();
  const field = flag === 'starred' ? 'starred' : 'greyZone';
  const updated = sectionQuestions.map((q) =>
    q.id === id ? { ...q, [field]: on } : q
  );
  const nextState: Partial<SectionQuestionsSlice> = { sectionQuestions: updated };
  if (activeSectionUrl) {
    nextState.sectionQuestionsCache = {
      ...sectionQuestionsCache,
      [activeSectionUrl]: updated,
    };
  }
  set(nextState);
  bumpFlagCount(flag, on ? 1 : -1);

  const write = flag === 'starred' ? setStarred : setGreyZone;
  write(id, on).catch((err) =>
    console.error(`[${flag}] write failed:`, err)
  );
}
