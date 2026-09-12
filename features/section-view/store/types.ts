import type { ParsedQuestion } from '@/lib/content/parser';
import type { SectionMeta } from '@/lib/content/topics';
import type { PriorityLevel } from '@/lib/types';
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
  selectMode: boolean;
  selectedIds: Set<string>;
  toggleSelectMode: () => void;
  toggleSelected: (id: string) => void;
  setSelected: (ids: string[]) => void;
  clearSelection: () => void;
  setSectionQuestions: (questions: ParsedQuestion[], section: SectionMeta) => void;
  updateQuestionPriority: (id: string, level: PriorityLevel | null) => void;
  toggleQuestionStarred: (id: string, wasStarred: boolean) => void;
  toggleQuestionGreyZone: (id: string, wasGreyZone: boolean) => void;
  togglePriorityFilter: (key: PriorityFilterKey) => void;
  toggleStatusFilter: (v: 'done' | 'notdone') => void;
  setSortMode: (mode: SortMode) => void;
  clearFilters: () => void;
}
