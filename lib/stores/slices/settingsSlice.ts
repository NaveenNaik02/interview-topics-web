import type { StateCreator } from 'zustand'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from '@/lib/ThemeContext'
import * as settingsDb from '@/lib/db/settings'
import * as settingsActions from '@/lib/actions/settings'
import type { AppState, SettingsSlice } from '../types'

export const createSettingsSlice: StateCreator<AppState, [], [], SettingsSlice> = (set, get) => ({
  settingsLoaded: false,
  defaultSort: 'manual',
  rememberFilters: true,
  settingsTheme: 'light',

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

  loadSettings: async (uid: string) => {
    const data = await settingsDb.fetchSettings(uid)

    if (data) {
      set({ defaultSort: data.default_sort, rememberFilters: data.remember_filters, settingsTheme: data.theme })
      try {
        localStorage.setItem('defaultSort', data.default_sort)
        localStorage.setItem('rememberFilters', data.remember_filters ? '1' : '0')
      } catch {}
    } else {
      // No row yet — bootstrap from localStorage so existing prefs aren't lost
      let lsTheme: Theme = 'light'
      let lsSort: SortMode = 'manual'
      let lsRemember = true
      try {
        const t = localStorage.getItem('theme')
        if (t === 'dark' || t === 'sepia') lsTheme = t
        const s = localStorage.getItem('defaultSort')
        if (s === 'high' || s === 'low') lsSort = s
        lsRemember = localStorage.getItem('rememberFilters') !== '0'
      } catch {}
      set({ defaultSort: lsSort, rememberFilters: lsRemember, settingsTheme: lsTheme })
      settingsActions.insertSettings({ default_sort: lsSort, remember_filters: lsRemember, theme: lsTheme })
        .catch(err => console.error('[settings] insert failed:', err))
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
      set({ settingsLoaded: true })
    } catch {}
  },
})
