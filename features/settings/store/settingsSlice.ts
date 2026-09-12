import type { StateCreator } from 'zustand';
import type { Theme } from '@/lib/context/ThemeContext';
import type { AppState, SettingsSlice } from '@/lib/stores/types';
import type { SortMode } from '../types';
import { DEFAULT_SETTINGS, type UserSettings } from '../db/db';
import * as settingsActions from '../actions';
import {
  presetsOf,
  mirrorToLocal,
  backfillPresets,
  readLocalSettings,
  insertWithRetry,
} from './hydrate';
import { createPresetActions } from './presets';

// Pure: the slice fields a saved row implies. createAppStore applies this at
// construction so the server's settings are right on the first render — no
// post-mount fetch, and no flash of the DEFAULT_SETTINGS placeholders.
export function settingsStateFrom(row: UserSettings) {
  const { migrated } = presetsOf(row);
  const savedIdExists = migrated.some(
    (p) => p.id === row.active_instruction_preset_id,
  );
  const activeInstructionPresetId = savedIdExists
    ? row.active_instruction_preset_id
    : migrated[0].id;
  return {
    settingsLoaded: true,
    defaultSort: row.default_sort,
    rememberFilters: row.remember_filters,
    settingsTheme: row.theme,
    navigateAfterMove: !!row.navigate_after_move,
    // null is a real, saved choice here ("None" — see the migration that
    // added this column), not a missing value to fall back from.
    defaultPriority: row.default_priority,
    instructionPresets: migrated,
    activeInstructionPresetId,
  };
}

export const createSettingsSlice: StateCreator<
  AppState,
  [],
  [],
  SettingsSlice
> = (set, get) => {
  const updateRemote = (updates: Partial<UserSettings>) => {
    if (get().user) {
      settingsActions
        .upsertSetting(updates)
        .catch((err) => console.error('[settings] update failed:', err));
    }
  };

  return {
    ...settingsStateFrom(DEFAULT_SETTINGS),
    settingsRow: null,
    settingsLoaded: false,
    ...createPresetActions(set, get, updateRemote),

    setDefaultSort: (v: SortMode) => {
      set({ defaultSort: v });
      try {
        localStorage.setItem('defaultSort', v);
      } catch {}
      updateRemote({ default_sort: v });
    },

    setRememberFilters: (v: boolean) => {
      set({ rememberFilters: v });
      try {
        localStorage.setItem('rememberFilters', v ? '1' : '0');
      } catch {}
      updateRemote({ remember_filters: v });
    },

    setThemeSetting: (v: Theme) => {
      set({ settingsTheme: v });
      updateRemote({ theme: v });
    },

    setNavigateAfterMove: (v: boolean) => {
      set({ navigateAfterMove: v });
      updateRemote({ navigate_after_move: v });
    },

    setDefaultPriority: (v) => {
      set({ defaultPriority: v });
      updateRemote({ default_priority: v });
    },

    // Restores every setting on this page — theme, study defaults, and the
    // four built-in AI instruction presets — to what a brand-new account
    // starts with. Never touches questions, progress, or topics. Setting
    // `settingsTheme` here is enough to apply it: ThemeSync watches that field
    // and pushes it into ThemeContext (which handles the DOM class + its own
    // localStorage key).
    resetSettingsToDefaults: () => {
      set(settingsStateFrom(DEFAULT_SETTINGS));
      mirrorToLocal(DEFAULT_SETTINGS);
      if (get().user) {
        settingsActions
          .upsertSetting(DEFAULT_SETTINGS)
          .catch((err) => console.error('[settings] reset failed:', err));
      }
    },

    // Browser-side follow-up to the server-seeded row, run once by
    // StoreProvider. Two branches, split by what only the browser can do:
    // mirroring the row into localStorage, or — when the account has no row
    // yet — bootstrapping one from whatever localStorage already holds.
    hydrateSettings: () => {
      const row = get().settingsRow;
      if (row) {
        mirrorToLocal(row);
        backfillPresets(row);
        return;
      }
      const local = readLocalSettings();
      set(settingsStateFrom(local));
      insertWithRetry(local);
    },
  };
};
