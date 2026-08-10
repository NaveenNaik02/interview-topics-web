import type { ParsedQuestion } from '@/lib/parser';
import type { SectionMeta } from '@/lib/topics';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { SortMode } from '@/features/settings';

export type PriorityFilterKey = 'high' | 'med' | 'low' | 'none';
export type StatusFilter = 'done' | 'notdone' | null;

export interface SectionQuestionsSlice {
  sectionQuestions: ParsedQuestion[];
  sectionQuestionsCache: Record<string, ParsedQuestion[]>;
  activeSectionUrl: string | null;
  filterSet: Set<PriorityFilterKey>;
  statusFilter: StatusFilter;
  sortMode: SortMode;
  setSectionQuestions: (questions: ParsedQuestion[], section: SectionMeta) => void;
  updateQuestionPriority: (id: string, level: PriorityLevel | null) => void;
  toggleQuestionStarred: (id: string, wasStarred: boolean) => void;
  togglePriorityFilter: (key: PriorityFilterKey) => void;
  toggleStatusFilter: (v: 'done' | 'notdone') => void;
  setSortMode: (mode: SortMode) => void;
  clearFilters: () => void;
}
