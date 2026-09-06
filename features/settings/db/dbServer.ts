import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { UserSettings } from './db';

// The caller's saved settings row, or null if they have none yet (a brand-new
// account — the store bootstraps one from localStorage in that case).
//
// Split from db.ts because that file is imported by the settings slice and
// SettingsClient while this one pulls in next/headers via createClient().
// RLS scopes user_settings to auth.uid(), so no user id and no client
// argument. Cached per-request: the root layout (for the theme class), the
// app layout (to seed the store), and /settings all read it on one request.
export const fetchSettings = cache(async (): Promise<UserSettings | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from('user_settings')
    .select(
      'default_sort, remember_filters, theme, instruction_presets, active_instruction_preset_id, navigate_after_move, default_priority',
    )
    .maybeSingle();
  return data as UserSettings | null;
});
