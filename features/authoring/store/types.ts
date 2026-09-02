import type { SectionMeta, TopicGroup } from '@/lib/topics';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { AqModelId } from '@/lib/ai/models';
import type { PlacementSuggestion } from '@/lib/ai/suggestPlacement';
import type { DuplicateCheckResult } from '@/lib/ai/checkDuplicate';
import type {
  AnswerVersion,
  PendingPlacement,
  QuestionDraft,
  QuestionInput,
} from '../types';

// Everything the modal needs to exist, handed over once at construction.
// AddQuestionModal / EditQuestionModal supply it; nothing here changes for
// the life of the modal except `groups`.
export interface AuthoringInit {
  heading: string;
  footNote: string;
  submitLabel: string;
  initialSection?: SectionMeta;
  initial?: QuestionDraft;
  // The question as saved. Present only when editing.
  original?: { title: string; markdown: string };
  excludeQuestionId?: string;
  // Starts the auto-run chain as soon as the modal opens.
  autoRun?: boolean;
  onDiscard?: () => void;
  onDeleted?: (id: string) => void;
  onSubmit: (input: QuestionInput, section: SectionMeta) => Promise<void>;
  onClose: () => void;
  groups: TopicGroup[];
  defaultPriority: PriorityLevel | null;
}

export interface ConfigSlice {
  heading: string;
  footNote: string;
  submitLabel: string;
  original?: { title: string; markdown: string };
  excludeQuestionId?: string;
  onSubmit: AuthoringInit['onSubmit'];
  onClose: () => void;
  onDiscard?: () => void;
  onDeleted?: (id: string) => void;
}

export interface DraftSlice {
  title: string;
  markdown: string;
  problem: string;
  tags: string;
  lang: string;
  priority: PriorityLevel | null;
  isImpl: boolean;
  // Asks the answer generator for a fenced code example on a non-impl
  // question. Per-question, reset every time the modal opens.
  wantCodeExample: boolean;
  tab: 'write' | 'preview';
  instructions: string;
  // Seeded from the Settings choice when the modal opens; nothing inside the
  // modal changes it.
  model: AqModelId;
  showInstructions: boolean;
  saving: boolean;
  saveError: string | null;
  answerVersions: AnswerVersion[];
  activeVersionId: string | null;
  draftCount: number;

  setTitle: (v: string) => void;
  setMarkdown: (v: string) => void;
  setProblem: (v: string) => void;
  setTags: (v: string) => void;
  setLang: (v: string) => void;
  setPriority: (v: PriorityLevel | null) => void;
  setIsImpl: (v: boolean) => void;
  setWantCodeExample: (v: boolean) => void;
  setTab: (v: 'write' | 'preview') => void;
  setInstructions: (v: string) => void;
  setShowInstructions: (v: boolean) => void;
  // Typing detaches from whichever draft was active; picking one re-attaches.
  editMarkdown: (v: string) => void;
  selectVersion: (v: AnswerVersion) => void;
  snapshotAnswer: () => void;
  addAnswerVersion: (text: string) => void;
  save: () => Promise<void>;
}

export interface PlacementSlice {
  groups: TopicGroup[];
  groupSlug: string;
  sectionK: string;
  // A topic/subtopic accepted from a suggestion but not created until save.
  pending: PendingPlacement | null;

  setGroups: (groups: TopicGroup[]) => void;
  setGroupSlug: (slug: string) => void;
  setSectionK: (key: string) => void;
  resolveTargetSection: () => Promise<SectionMeta>;
}

// Text produced by an AI action, waiting to be typed into a field. The
// typewriter is a React effect (it holds an interval it must clear on
// unmount), so the store parks the result here and a bridge hook plays it in.
export interface Stream {
  target: 'title' | 'markdown' | 'problem';
  text: string;
  // Changes on every request so repeat results still trigger the effect.
  token: number;
}

export interface AiSlice {
  questionState: 'idle' | 'loading' | 'error';
  problemState: 'idle' | 'loading' | 'error';
  answerState: 'idle' | 'loading' | 'done' | 'error' | 'limited';
  answerError: string | null;
  dupState: 'idle' | 'loading' | 'done' | 'error';
  dupResult: DuplicateCheckResult | null;
  suggestState: 'idle' | 'loading' | 'error';
  suggestion: PlacementSuggestion | null;
  stream: Stream | null;

  generateQuestion: () => Promise<void>;
  generateProblem: () => Promise<void>;
  generateAnswer: () => Promise<void>;
  formatAnswer: () => Promise<void>;
  checkDuplicate: () => Promise<void>;
  resetDuplicate: () => void;
  suggestPlacement: () => Promise<void>;
  acceptSuggestion: () => void;
  dismissSuggestion: () => void;
  finishStream: () => void;
}

// The same calls the manual flow offers one button at a time, in the order
// auto-run chains them. Order is the pipeline — a step's index is what makes
// it done, running, or still queued.
export const AUTO_STEPS = [
  'question',
  'placement',
  'duplicate',
  'answer',
] as const;

export type AutoStep = (typeof AUTO_STEPS)[number];

export interface AutoRunSlice {
  // The steps of the run, in order. The duplicate check is skipped at its
  // turn rather than dropped from the list, so the checklist stays stable.
  autoSteps: readonly AutoStep[];
  // Index into autoSteps of the step running now, or the one it stopped at.
  autoStep: number;
  // 'idle' hides the banner entirely; the form is then plain manual.
  autoStatus: 'idle' | 'running' | 'paused' | 'done';

  startAuto: () => Promise<void>;
  // "Switch to manual" — abandons an in-flight run and hides the banner.
  dismissAuto: () => void;
  // Dismisses a flagged duplicate and finishes the remaining steps.
  keepAsNew: () => Promise<void>;
}

export type AuthoringState = ConfigSlice &
  DraftSlice &
  PlacementSlice &
  AiSlice &
  AutoRunSlice;
