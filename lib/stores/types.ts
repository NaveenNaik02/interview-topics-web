import type { User } from '@supabase/supabase-js'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from '@/lib/ThemeContext'
import type { PriorityLevel } from '@/lib/offlineSync'
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
  stats: ProgressStats
  mounted: boolean
  setInitialTotals: (totals: Record<string, number>) => void
  setSectionTotal: (url: string, total: number) => void
  toggle: (id: string) => void
  setMany: (ids: string[], value: boolean) => void
  resetAll: () => void
  loadProgress: (uid: string) => Promise<void>
}

export interface PrioritySlice {
  priorityStore: PriorityStore
  setPriority: (id: string, level: PriorityLevel | null) => void
  loadPriority: (uid: string) => Promise<void>
}

export interface SettingsSlice {
  settingsLoaded: boolean
  defaultSort: SortMode
  rememberFilters: boolean
  settingsTheme: Theme
  setDefaultSort: (v: SortMode) => void
  setRememberFilters: (v: boolean) => void
  setThemeSetting: (v: Theme) => void
  loadSettings: (uid: string) => Promise<void>
  initSettingsFromLocalStorage: () => void
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

export type AppState = AuthSlice & ProgressSlice & PrioritySlice & SettingsSlice & OfflineSlice
