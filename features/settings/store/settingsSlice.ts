import type { StateCreator } from 'zustand';
import type { SortMode } from '../types';
import type { Theme } from '@/lib/context/ThemeContext';
import { DEFAULT_SETTINGS, type UserSettings } from '../db/db';
import * as settingsActions from '../actions';
import {
  type InstructionPreset,
  presetUid,
  loadPresets,
  savePresets,
  loadActivePresetId,
  saveActivePresetId,
  migratePresets,
} from '@/lib/instructionPresets';
import type { AppState, SettingsSlice } from '@/lib/stores/types';

// Older saved preset lists (from before the built-in text/code/suggestion/
// problem defaults existed) are migrated so all protected presets are always
// present. Kept as its own function because hydrateSettings has to know
// whether the migration actually added anything, to decide on the backfill.
const presetsOf = (row: UserSettings) => {
  const stored = row.instruction_presets?.length
    ? row.instruction_presets
    : DEFAULT_SETTINGS.instruction_presets;
  return { stored, migrated: migratePresets(stored) };
};

// Pure: the slice fields a saved row implies. createAppStore applies this at
// construction so the server's settings are right on the first render — no
// post-mount fetch, and no flash of the DEFAULT_SETTINGS placeholders.
export function settingsStateFrom(row: UserSettings) {
  const { migrated } = presetsOf(row);
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
    activeInstructionPresetId: migrated.some(
      (p) => p.id === row.active_instruction_preset_id,
    )
      ? row.active_instruction_preset_id
      : migrated[0].id,
  };
}

export const createSettingsSlice: StateCreator<
  AppState,
  [],
  [],
  SettingsSlice
> = (set, get) => {
  const updateRemote = (
    updates: Parameters<typeof settingsActions.upsertSetting>[0],
  ) => {
    if (get().user) {
      settingsActions
        .upsertSetting(updates)
        .catch((err) => console.error('[settings] update failed:', err));
    }
  };

  return {
    settingsRow: null,
    settingsLoaded: false,
    defaultSort: DEFAULT_SETTINGS.default_sort,
    rememberFilters: DEFAULT_SETTINGS.remember_filters,
    settingsTheme: DEFAULT_SETTINGS.theme,
    navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
    defaultPriority: DEFAULT_SETTINGS.default_priority,
    instructionPresets: DEFAULT_SETTINGS.instruction_presets,
    activeInstructionPresetId: DEFAULT_SETTINGS.active_instruction_preset_id,

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

    setActiveInstructionPresetId: (id: string) => {
      set({ activeInstructionPresetId: id });
      saveActivePresetId(id);
      updateRemote({ active_instruction_preset_id: id });
    },

    addInstructionPreset: ({
      name,
      text,
    }: {
      name: string;
      text: string;
    }): InstructionPreset => {
      const record: InstructionPreset = {
        id: presetUid(),
        name: (name || 'Untitled').trim() || 'Untitled',
        text: (text || '').trim(),
      };
      const next = [...get().instructionPresets, record];
      set({ instructionPresets: next });
      savePresets(next);
      updateRemote({ instruction_presets: next });
      return record;
    },

    updateInstructionPreset: (
      id: string,
      { name, text }: { name: string; text: string },
    ) => {
      const next = get().instructionPresets.map((p) =>
        p.id === id
          ? { ...p, name: name.trim() || p.name, text: text.trim() }
          : p,
      );
      set({ instructionPresets: next });
      savePresets(next);
      updateRemote({ instruction_presets: next });
    },

    deleteInstructionPreset: (id: string) => {
      const { instructionPresets, activeInstructionPresetId } = get();
      const target = instructionPresets.find((p) => p.id === id);
      if (!target || target.protected || instructionPresets.length <= 1) {
        return;
      }
      const next = instructionPresets.filter((p) => p.id !== id);
      set({ instructionPresets: next });
      savePresets(next);
      const nextActiveId =
        activeInstructionPresetId === id ? next[0].id : activeInstructionPresetId;
      if (nextActiveId !== activeInstructionPresetId) {
        set({ activeInstructionPresetId: nextActiveId });
        saveActivePresetId(nextActiveId);
      }
      updateRemote({
        instruction_presets: next,
        ...(nextActiveId !== activeInstructionPresetId
          ? { active_instruction_preset_id: nextActiveId }
          : {}),
      });
    },

    // Restores every setting on this page — theme, study defaults, and the
    // four built-in AI instruction presets — to what a brand-new account
    // starts with. Never touches questions, progress, or topics. Setting
    // `settingsTheme` here is enough to apply it: ThemeSync watches that field
    // and pushes it into ThemeContext (which handles the DOM class + its own
    // localStorage key).
    resetSettingsToDefaults: () => {
      const freshPresets = DEFAULT_SETTINGS.instruction_presets.map((p) => ({
        ...p,
      }));
      const freshActiveId = DEFAULT_SETTINGS.active_instruction_preset_id;
      set({
        defaultSort: DEFAULT_SETTINGS.default_sort,
        rememberFilters: DEFAULT_SETTINGS.remember_filters,
        settingsTheme: DEFAULT_SETTINGS.theme,
        navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
        defaultPriority: DEFAULT_SETTINGS.default_priority,
        instructionPresets: freshPresets,
        activeInstructionPresetId: freshActiveId,
      });
      try {
        localStorage.setItem('defaultSort', DEFAULT_SETTINGS.default_sort);
        localStorage.setItem(
          'rememberFilters',
          DEFAULT_SETTINGS.remember_filters ? '1' : '0',
        );
      } catch {}
      savePresets(freshPresets);
      saveActivePresetId(freshActiveId);
      if (get().user) {
        settingsActions
          .upsertSetting({
            default_sort: DEFAULT_SETTINGS.default_sort,
            remember_filters: DEFAULT_SETTINGS.remember_filters,
            theme: DEFAULT_SETTINGS.theme,
            navigate_after_move: DEFAULT_SETTINGS.navigate_after_move,
            default_priority: DEFAULT_SETTINGS.default_priority,
            instruction_presets: freshPresets,
            active_instruction_preset_id: freshActiveId,
          })
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
        try {
          localStorage.setItem('defaultSort', row.default_sort);
          localStorage.setItem(
            'rememberFilters',
            row.remember_filters ? '1' : '0',
          );
        } catch {}
        const { stored, migrated } = presetsOf(row);
        savePresets(migrated);
        saveActivePresetId(row.active_instruction_preset_id);
        // The migration only changed the in-memory/local copy — if it added
        // any missing defaults, backfill the row now instead of waiting for
        // the user to next touch a preset (the only other write path).
        if (migrated.length !== stored.length) {
          settingsActions
            .upsertSetting({ instruction_presets: migrated })
            .catch((err) => console.error('[settings] backfill failed:', err));
        }
        return;
      }

      // No row yet — bootstrap from localStorage so existing prefs aren't
      // lost, falling back to DEFAULT_SETTINGS for anything not found there.
      let lsTheme: Theme = DEFAULT_SETTINGS.theme;
      let lsSort: SortMode = DEFAULT_SETTINGS.default_sort;
      let lsRemember = DEFAULT_SETTINGS.remember_filters;
      try {
        const t = localStorage.getItem('theme');
        if (t === 'dark' || t === 'sepia') {
          lsTheme = t;
        }
        const s = localStorage.getItem('defaultSort');
        if (s === 'high' || s === 'low') {
          lsSort = s;
        }
        lsRemember = localStorage.getItem('rememberFilters') !== '0';
      } catch {}
      const lsPresets = loadPresets();
      const lsActiveId = loadActivePresetId(lsPresets);
      set({
        defaultSort: lsSort,
        rememberFilters: lsRemember,
        settingsTheme: lsTheme,
        navigateAfterMove: DEFAULT_SETTINGS.navigate_after_move,
        defaultPriority: DEFAULT_SETTINGS.default_priority,
        instructionPresets: lsPresets,
        activeInstructionPresetId: lsActiveId,
        settingsLoaded: true,
      });
      const bootstrapSettings = {
        default_sort: lsSort,
        remember_filters: lsRemember,
        theme: lsTheme,
        instruction_presets: lsPresets,
        active_instruction_preset_id: lsActiveId,
        navigate_after_move: DEFAULT_SETTINGS.navigate_after_move,
        default_priority: DEFAULT_SETTINGS.default_priority,
      };
      // insertSettings is a Server Action (cookie-based auth) called right
      // after a client-side sign-in — the browser client's session is already
      // updated in memory, but its cookie write can still be in flight, so
      // the very next Server Action request can race it and see no session
      // yet. One short-delayed retry is enough; the cookie is always settled
      // by then.
      settingsActions.insertSettings(bootstrapSettings).catch((err) => {
        if (err instanceof Error && err.message === 'Not authenticated') {
          setTimeout(() => {
            settingsActions
              .insertSettings(bootstrapSettings)
              .catch((err2) => console.error('[settings] insert failed:', err2));
          }, 500);
          return;
        }
        console.error('[settings] insert failed:', err);
      });
    },
  };
};
