import type { User } from '@supabase/supabase-js';
import type { SortMode } from '@/features/settings';
import type { SectionQuestionsSlice } from '@/features/section-view/store/types';
import type { Theme } from '@/lib/context/ThemeContext';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { TopicGroup } from '@/lib/content/topics';
import type { InstructionPreset } from '@/lib/instructionPresets';
import type { InboxItem } from '@/features/inbox';
import type { SetAsideItem } from '@/lib/db/setAside';
import type { ShortlistFlag } from '@/lib/db/shortlist';
import type { ProgressStats } from './progressSelectors';

export type ProgressStore = Record<string, boolean>;

export interface AuthSlice {
  user: User | null;
  signInWithGitHub: () => Promise<void>;
  signOut: () => Promise<void>;
  // Subscribes to auth state; returns an unsubscribe function for effect cleanup.
  initAuth: () => () => void;
}

export interface ProgressSlice {
  store: ProgressStore;
  totals: Record<string, number>;
  // Merged static + DB-backed topic tree. Seeded from the server at store
  // construction (see createAppStore) and re-synced by StoreProvider on
  // router.refresh(), so stats/offline caching reflect dynamically added
  // topics/subtopics, not just the static curriculum.
  groups: TopicGroup[];
  stats: ProgressStats;
  mounted: boolean;
  setInitialTotals: (totals: Record<string, number>) => void;
  setSectionTotal: (url: string, total: number) => void;
  setGroups: (groups: TopicGroup[]) => void;
  toggle: (id: string) => void;
  setMany: (ids: string[], value: boolean) => void;
  resetAll: () => void;
  // Carries a completed flag from an old question id to a new one — used
  // when a question moves to a different section and the server mints it a
  // new (correctly section-prefixed) id, so the local store doesn't have to
  // wait for a full reload to stop reading the question as "not done".
  renameProgressId: (oldId: string, newId: string) => void;
  // Drops progress entries for questions that no longer exist in a section —
  // deleting/setting aside a question removes its DB row, but the local store
  // would keep counting it until a full reload ("8 of 7 complete").
  pruneSectionProgress: (topic: string, file: string, ids: string[]) => void;
  loadProgress: (uid: string) => Promise<void>;
}

export interface SettingsSlice {
  settingsLoaded: boolean;
  defaultSort: SortMode;
  rememberFilters: boolean;
  settingsTheme: Theme;
  navigateAfterMove: boolean;
  defaultPriority: PriorityLevel | null;
  setDefaultSort: (v: SortMode) => void;
  setRememberFilters: (v: boolean) => void;
  setThemeSetting: (v: Theme) => void;
  setNavigateAfterMove: (v: boolean) => void;
  setDefaultPriority: (v: PriorityLevel | null) => void;
  // Instruction presets
  instructionPresets: InstructionPreset[];
  activeInstructionPresetId: string;
  setActiveInstructionPresetId: (id: string) => void;
  addInstructionPreset: (v: {
    name: string;
    text: string;
  }) => InstructionPreset;
  updateInstructionPreset: (
    id: string,
    v: { name: string; text: string },
  ) => void;
  deleteInstructionPreset: (id: string) => void;
  resetSettingsToDefaults: () => void;
  loadSettings: (uid: string) => Promise<void>;
  initSettingsFromLocalStorage: () => void;
}

export interface InboxSlice {
  // Count only — the Sidebar badge is the only thing that reads this
  // globally. Full item bodies are fetched page-side (see
  // fetchInitialInboxPageData) only when the Inbox page itself renders.
  inboxCount: number;
  appendInboxItem: (item: InboxItem) => void;
  appendInboxItems: (items: InboxItem[]) => void;
  removeInboxItem: (id: string) => void;
  loadInboxCount: (uid: string) => Promise<void>;
}

export interface SetAsideSlice {
  // Same reasoning as InboxSlice.inboxCount.
  setAsideCount: number;
  appendSetAsideItem: (item: SetAsideItem) => void;
  removeSetAsideItem: (id: string) => void;
  loadSetAsideCount: (uid: string) => Promise<void>;
}

export interface FlagCountsSlice {
  // Counts only — see InboxSlice.inboxCount for the same reasoning. The flags
  // themselves now live on the questions row, read directly off whatever list
  // of questions a page already fetched.
  flagCounts: Record<ShortlistFlag, number>;
  bumpFlagCount: (flag: ShortlistFlag, delta: number) => void;
  loadFlagCounts: (uid: string) => Promise<void>;
}

export interface QuestionOrderSlice {
  // Personal manual-order position, keyed by question id. Only ever compared
  // between questions already scoped to one section by the caller, so a flat
  // map is enough — no per-section keying.
  orderStore: Record<string, number>;
  // Rewrites the full position for every id in the given order (0..N-1) —
  // a drag-drop always reorders the whole visible list, so there's no
  // single-item variant.
  setQuestionOrder: (ids: string[]) => void;
  // Sibling of renameProgressId, for the order store.
  renameOrderId: (oldId: string, newId: string) => void;
}

export interface OfflineSlice {
  isOnline: boolean;
  offlineModeEnabled: boolean;
  isCaching: boolean;
  cachingProgress: { done: number; total: number } | null;
  pendingOpsCount: number;
  isSyncing: boolean;
  cachedAt: string | null;
  enableOfflineMode: () => Promise<void>;
  disableOfflineMode: () => Promise<void>;
  syncNow: () => Promise<void>;
  // Hydrates from localStorage + wires online/offline listeners; returns cleanup.
  initOfflineState: () => () => void;
}



export type AppState = AuthSlice &
  ProgressSlice &
  SettingsSlice &
  InboxSlice &
  SetAsideSlice &
  FlagCountsSlice &
  OfflineSlice &
  QuestionOrderSlice &
  SectionQuestionsSlice;
