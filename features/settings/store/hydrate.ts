import type { Theme } from '@/lib/context/ThemeContext';
import {
  loadPresets,
  savePresets,
  loadActivePresetId,
  saveActivePresetId,
  migratePresets,
} from '@/lib/instructionPresets';
import type { SortMode } from '../types';
import { DEFAULT_SETTINGS, type UserSettings } from '../db/db';
import * as settingsActions from '../actions';

// Older saved preset lists (from before the built-in text/code/suggestion/
// problem defaults existed) are migrated so all protected presets are always
// present. Returns both copies because backfillPresets has to know whether
// the migration actually added anything.
export const presetsOf = (row: UserSettings) => {
  const stored = row.instruction_presets?.length
    ? row.instruction_presets
    : DEFAULT_SETTINGS.instruction_presets;
  return { stored, migrated: migratePresets(stored) };
};

// The browser-side copy of a settings row — what readLocalSettings reads back
// for an account that has no saved row yet.
export const mirrorToLocal = (row: UserSettings) => {
  try {
    localStorage.setItem('defaultSort', row.default_sort);
    localStorage.setItem('rememberFilters', row.remember_filters ? '1' : '0');
  } catch {}
  savePresets(presetsOf(row).migrated);
  saveActivePresetId(row.active_instruction_preset_id);
};

// The migration only changes the in-memory/local copy — if it added any
// missing defaults, backfill the row now instead of waiting for the user to
// next touch a preset (the only other write path).
export const backfillPresets = (row: UserSettings) => {
  const { stored, migrated } = presetsOf(row);
  if (migrated.length === stored.length) return;
  settingsActions
    .upsertSetting({ instruction_presets: migrated })
    .catch((err) => console.error('[settings] backfill failed:', err));
};

// Whatever the browser already holds, as a settings row — so an account with
// no saved row doesn't lose prefs set before it had one. Anything not found
// falls back to DEFAULT_SETTINGS.
export const readLocalSettings = (): UserSettings => {
  let theme: Theme = DEFAULT_SETTINGS.theme;
  let sort: SortMode = DEFAULT_SETTINGS.default_sort;
  let remember = DEFAULT_SETTINGS.remember_filters;
  try {
    const t = localStorage.getItem('theme');
    if (t === 'dark' || t === 'sepia') {
      theme = t;
    }
    const s = localStorage.getItem('defaultSort');
    if (s === 'high' || s === 'low') {
      sort = s;
    }
    remember = localStorage.getItem('rememberFilters') !== '0';
  } catch {}
  const presets = loadPresets();
  return {
    ...DEFAULT_SETTINGS,
    theme,
    default_sort: sort,
    remember_filters: remember,
    instruction_presets: presets,
    active_instruction_preset_id: loadActivePresetId(presets),
  };
};

// insertSettings is a Server Action (cookie-based auth) called right after a
// client-side sign-in — the browser client's session is already updated in
// memory, but its cookie write can still be in flight, so the very next
// Server Action request can race it and see no session yet. One short-delayed
// retry is enough; the cookie is always settled by then.
export const insertWithRetry = (row: UserSettings) => {
  settingsActions.insertSettings(row).catch((err) => {
    if (err instanceof Error && err.message === 'Not authenticated') {
      setTimeout(() => {
        settingsActions
          .insertSettings(row)
          .catch((err2) => console.error('[settings] insert failed:', err2));
      }, 500);
      return;
    }
    console.error('[settings] insert failed:', err);
  });
};
