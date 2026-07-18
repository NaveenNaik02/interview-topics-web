import type { StateCreator } from 'zustand'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from '@/lib/ThemeContext'
import * as settingsDb from '@/lib/db/settings'
import { DEFAULT_SETTINGS } from '@/lib/db/settings'
import * as settingsActions from '@/lib/actions/settings'
import {
  type InstructionPreset,
  presetUid,
  loadPresets,
  savePresets,
  loadActivePresetId,
  saveActivePresetId,
  migratePresets,
} from '@/lib/instructionPresets'
import type { AppState, SettingsSlice } from '../types'

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set, get) => ({
  settingsLoaded: false,
  defaultSort: DEFAULT_SETTINGS.default_sort,
  rememberFilters: DEFAULT_SETTINGS.remember_filters,
  settingsTheme: DEFAULT_SETTINGS.theme,
  navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
  instructionPresets: DEFAULT_SETTINGS.instruction_presets,
  activeInstructionPresetId: DEFAULT_SETTINGS.active_instruction_preset_id,

  setDefaultSort: (v: SortMode) => {
    set({ defaultSort: v })
    try { localStorage.setItem('defaultSort', v) } catch {}
    if (get().user) settingsActions.upsertSetting({ default_sort: v }).catch(err => console.error('[settings] update failed:', err))
  },

  setRememberFilters: (v: boolean) => {
    set({ rememberFilters: v })
    try { localStorage.setItem('rememberFilters', v ? '1' : '0') } catch {}
    if (get().user) settingsActions.upsertSetting({ remember_filters: v }).catch(err => console.error('[settings] update failed:', err))
  },

  setThemeSetting: (v: Theme) => {
    set({ settingsTheme: v })
    if (get().user) settingsActions.upsertSetting({ theme: v }).catch(err => console.error('[settings] update failed:', err))
  },

  setNavigateAfterMove: (v: boolean) => {
    set({ navigateAfterMove: v })
    if (get().user) settingsActions.upsertSetting({ navigate_after_move: v }).catch(err => console.error('[settings] update failed:', err))
  },

  setActiveInstructionPresetId: (id: string) => {
    set({ activeInstructionPresetId: id })
    saveActivePresetId(id)
    if (get().user) settingsActions.upsertSetting({ active_instruction_preset_id: id }).catch(err => console.error('[settings] update failed:', err))
  },

  addInstructionPreset: ({ name, text }: { name: string; text: string }): InstructionPreset => {
    const record: InstructionPreset = { id: presetUid(), name: (name || 'Untitled').trim() || 'Untitled', text: (text || '').trim() }
    const next = [...get().instructionPresets, record]
    set({ instructionPresets: next })
    savePresets(next)
    if (get().user) settingsActions.upsertSetting({ instruction_presets: next }).catch(err => console.error('[settings] update failed:', err))
    return record
  },

  updateInstructionPreset: (id: string, { name, text }: { name: string; text: string }) => {
    const next = get().instructionPresets.map(p => p.id === id ? { ...p, name: name.trim() || p.name, text: text.trim() } : p)
    set({ instructionPresets: next })
    savePresets(next)
    if (get().user) settingsActions.upsertSetting({ instruction_presets: next }).catch(err => console.error('[settings] update failed:', err))
  },

  deleteInstructionPreset: (id: string) => {
    const { instructionPresets, activeInstructionPresetId, user } = get()
    const target = instructionPresets.find(p => p.id === id)
    if (!target || target.protected || instructionPresets.length <= 1) return
    const next = instructionPresets.filter(p => p.id !== id)
    set({ instructionPresets: next })
    savePresets(next)
    const nextActiveId = activeInstructionPresetId === id ? next[0].id : activeInstructionPresetId
    if (nextActiveId !== activeInstructionPresetId) {
      set({ activeInstructionPresetId: nextActiveId })
      saveActivePresetId(nextActiveId)
    }
    if (user) {
      settingsActions.upsertSetting({
        instruction_presets: next,
        ...(nextActiveId !== activeInstructionPresetId ? { active_instruction_preset_id: nextActiveId } : {}),
      }).catch(err => console.error('[settings] update failed:', err))
    }
  },

  // Restores study defaults and the four built-in AI instruction presets to
  // what a brand-new account starts with. Deliberately leaves theme alone
  // (a display preference, not a "setting" in this sense) and never touches
  // questions, progress, or topics.
  resetSettingsToDefaults: () => {
    const freshPresets = DEFAULT_SETTINGS.instruction_presets.map(p => ({ ...p }))
    const freshActiveId = DEFAULT_SETTINGS.active_instruction_preset_id
    set({
      defaultSort: DEFAULT_SETTINGS.default_sort,
      rememberFilters: DEFAULT_SETTINGS.remember_filters,
      navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
      instructionPresets: freshPresets,
      activeInstructionPresetId: freshActiveId,
    })
    try {
      localStorage.setItem('defaultSort', DEFAULT_SETTINGS.default_sort)
      localStorage.setItem('rememberFilters', DEFAULT_SETTINGS.remember_filters ? '1' : '0')
    } catch {}
    savePresets(freshPresets)
    saveActivePresetId(freshActiveId)
    if (get().user) {
      settingsActions.upsertSetting({
        default_sort: DEFAULT_SETTINGS.default_sort,
        remember_filters: DEFAULT_SETTINGS.remember_filters,
        navigate_after_move: DEFAULT_SETTINGS.navigate_after_move,
        instruction_presets: freshPresets,
        active_instruction_preset_id: freshActiveId,
      }).catch(err => console.error('[settings] reset failed:', err))
    }
  },

  loadSettings: async (uid: string) => {
    const data = await settingsDb.fetchSettings(uid)

    if (data) {
      // Migrate older saved preset lists (from before the built-in text/code/
      // suggestion/problem defaults existed) so all protected presets are
      // always present.
      const storedPresets = data.instruction_presets?.length ? data.instruction_presets : DEFAULT_SETTINGS.instruction_presets
      const presets = migratePresets(storedPresets)
      const activeId = presets.some(p => p.id === data.active_instruction_preset_id) ? data.active_instruction_preset_id : presets[0].id
      set({
        defaultSort: data.default_sort,
        rememberFilters: data.remember_filters,
        settingsTheme: data.theme,
        navigateAfterMove: !!data.navigate_after_move,
        instructionPresets: presets,
        activeInstructionPresetId: activeId,
      })
      try {
        localStorage.setItem('defaultSort', data.default_sort)
        localStorage.setItem('rememberFilters', data.remember_filters ? '1' : '0')
      } catch {}
      savePresets(presets)
      saveActivePresetId(data.active_instruction_preset_id)
      // Migration only changed the in-memory/local copy above — if it added
      // any missing defaults, backfill the row now instead of waiting for
      // the user to next touch a preset (which is the only other write path).
      if (presets.length !== storedPresets.length) {
        settingsActions.upsertSetting({ instruction_presets: presets }).catch(err => console.error('[settings] backfill failed:', err))
      }
    } else {
      // No row yet — bootstrap from localStorage so existing prefs aren't lost,
      // falling back to DEFAULT_SETTINGS for anything not found there.
      let lsTheme: Theme = DEFAULT_SETTINGS.theme
      let lsSort: SortMode = DEFAULT_SETTINGS.default_sort
      let lsRemember = DEFAULT_SETTINGS.remember_filters
      try {
        const t = localStorage.getItem('theme')
        if (t === 'dark' || t === 'sepia') lsTheme = t
        const s = localStorage.getItem('defaultSort')
        if (s === 'high' || s === 'low') lsSort = s
        lsRemember = localStorage.getItem('rememberFilters') !== '0'
      } catch {}
      const lsPresets = loadPresets()
      const lsActiveId = loadActivePresetId(lsPresets)
      set({
        defaultSort: lsSort,
        rememberFilters: lsRemember,
        settingsTheme: lsTheme,
        navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
        instructionPresets: lsPresets,
        activeInstructionPresetId: lsActiveId,
      })
      settingsActions.insertSettings({
        default_sort: lsSort, remember_filters: lsRemember, theme: lsTheme,
        instruction_presets: lsPresets, active_instruction_preset_id: lsActiveId,
        navigate_after_move: DEFAULT_SETTINGS.navigate_after_move,
      }).catch(err => console.error('[settings] insert failed:', err))
    }
    set({ settingsLoaded: true })
  },

  // Hydrate settings from localStorage immediately on mount so the correct
  // sort/filter defaults are available on first paint, instead of waiting on
  // the Supabase round-trip in loadSettings (which caused sections to briefly
  // — or on a slow connection, not-so-briefly — render in manual order even
  // when a different default was saved).
  initSettingsFromLocalStorage: () => {
    try {
      const s = localStorage.getItem('defaultSort')
      if (s === 'manual' || s === 'high' || s === 'low') set({ defaultSort: s })
      const r = localStorage.getItem('rememberFilters')
      if (r !== null) set({ rememberFilters: r !== '0' })
      const t = localStorage.getItem('theme')
      if (t === 'dark' || t === 'sepia' || t === 'light') set({ settingsTheme: t })
      const presets = loadPresets()
      set({ instructionPresets: presets, activeInstructionPresetId: loadActivePresetId(presets) })
      set({ settingsLoaded: true })
    } catch {}
  },
})
