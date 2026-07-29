import type { User } from '@supabase/supabase-js'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from '@/lib/ThemeContext'
import type { PriorityLevel } from '@/lib/offlineSync'
import type { TopicGroup } from '@/lib/topics'
import type { InstructionPreset } from '@/lib/instructionPresets'
import type { InboxItem } from '@/lib/db/inbox'
import type { SetAsideItem } from '@/lib/db/setAside'
import type { ProgressStats } from './progressSelectors'

export type ProgressStore = Record<string, boolean>
export type PriorityStore = Record<string, PriorityLevel>

export interface AuthSlice {
  user: User | null
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  // Subscribes to auth state; returns an unsubscribe function for effect cleanup.
  initAuth: () => () => void
}

export interface ProgressSlice {
  store: ProgressStore
  totals: Record<string, number>
  // Merged static + DB-backed topic tree, kept in sync from TopicsContext by
  // StoreBootstrap (a plain store action can't call the useTopicGroups()
  // hook itself) — needed here so stats/offline caching reflect dynamically
  // added topics/subtopics, not just the static curriculum.
  groups: TopicGroup[]
  stats: ProgressStats
  mounted: boolean
  setInitialTotals: (totals: Record<string, number>) => void
  setSectionTotal: (url: string, total: number) => void
  setGroups: (groups: TopicGroup[]) => void
  toggle: (id: string) => void
  setMany: (ids: string[], value: boolean) => void
  resetAll: () => void
  // Carries a completed flag from an old question id to a new one — used
  // when a question moves to a different section and the server mints it a
  // new (correctly section-prefixed) id, so the local store doesn't have to
  // wait for a full reload to stop reading the question as "not done".
  renameProgressId: (oldId: string, newId: string) => void
  loadProgress: (uid: string) => Promise<void>
}

export interface PrioritySlice {
  priorityStore: PriorityStore
  setPriority: (id: string, level: PriorityLevel | null) => void
  // Sibling of renameProgressId, for the priority store.
  renamePriorityId: (oldId: string, newId: string) => void
  loadPriority: (uid: string) => Promise<void>
}

export interface SettingsSlice {
  settingsLoaded: boolean
  defaultSort: SortMode
  rememberFilters: boolean
  settingsTheme: Theme
  navigateAfterMove: boolean
  defaultPriority: PriorityLevel | null
  setDefaultSort: (v: SortMode) => void
  setRememberFilters: (v: boolean) => void
  setThemeSetting: (v: Theme) => void
  setNavigateAfterMove: (v: boolean) => void
  setDefaultPriority: (v: PriorityLevel | null) => void
  // Instruction presets
  instructionPresets: InstructionPreset[]
  activeInstructionPresetId: string
  setActiveInstructionPresetId: (id: string) => void
  addInstructionPreset: (v: { name: string; text: string }) => InstructionPreset
  updateInstructionPreset: (id: string, v: { name: string; text: string }) => void
  deleteInstructionPreset: (id: string) => void
  resetSettingsToDefaults: () => void
  loadSettings: (uid: string) => Promise<void>
  initSettingsFromLocalStorage: () => void
}

export interface InboxSlice {
  inboxItems: InboxItem[]
  appendInboxItem: (item: InboxItem) => void
  appendInboxItems: (items: InboxItem[]) => void
  removeInboxItem: (id: string) => void
  loadInbox: (uid: string) => Promise<void>
}

export interface SetAsideSlice {
  setAsideItems: SetAsideItem[]
  appendSetAsideItem: (item: SetAsideItem) => void
  removeSetAsideItem: (id: string) => void
  loadSetAside: (uid: string) => Promise<void>
}

export interface StarredSlice {
  starredStore: Record<string, boolean>
  toggleStar: (id: string) => void
  // Sibling of renameProgressId/renamePriorityId, for the starred store.
  renameStarId: (oldId: string, newId: string) => void
  loadStarred: (uid: string) => Promise<void>
}

export interface QuestionOrderSlice {
  // Personal manual-order position, keyed by question id. Only ever compared
  // between questions already scoped to one section by the caller, so a flat
  // map (like priorityStore/starredStore) is enough — no per-section keying.
  orderStore: Record<string, number>
  // Rewrites the full position for every id in the given order (0..N-1) —
  // a drag-drop always reorders the whole visible list, so there's no
  // single-item variant.
  setQuestionOrder: (ids: string[]) => void
  // Sibling of renameProgressId/renamePriorityId/renameStarId, for the order store.
  renameOrderId: (oldId: string, newId: string) => void
  loadQuestionOrder: (uid: string) => Promise<void>
}

export interface OfflineSlice {
  isOnline: boolean
  offlineModeEnabled: boolean
  isCaching: boolean
  cachingProgress: { done: number; total: number } | null
  pendingOpsCount: number
  isSyncing: boolean
  cachedAt: string | null
  enableOfflineMode: () => Promise<void>
  disableOfflineMode: () => Promise<void>
  syncNow: () => Promise<void>
  // Hydrates from localStorage + wires online/offline listeners; returns cleanup.
  initOfflineState: () => () => void
}

export type AppState = AuthSlice & ProgressSlice & PrioritySlice & SettingsSlice & InboxSlice & SetAsideSlice & StarredSlice & OfflineSlice & QuestionOrderSlice
