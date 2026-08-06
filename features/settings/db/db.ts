import { supabase } from '@/lib/supabase/client';
import type { SortMode } from '@/components/FilterSortToolbar';
import type { Theme } from '@/lib/context/ThemeContext';
import type { PriorityLevel } from '@/lib/offlineSync';
import {
  DEFAULT_PRESETS,
  type InstructionPreset,
} from '@/lib/instructionPresets';

export interface UserSettings {
  default_sort: SortMode;
  remember_filters: boolean;
  theme: Theme;
  instruction_presets: InstructionPreset[];
  active_instruction_preset_id: string;
  navigate_after_move: boolean;
  default_priority: PriorityLevel | null;
}

// Single source of truth for "what a brand-new account starts with" and
// "what Reset settings restores" — every other default (in ProgressContext's
// bootstrap/reset and the settings Zustand slice) should read from here
// rather than repeating its own literals.
export const DEFAULT_SETTINGS: UserSettings = {
  default_sort: 'manual',
  remember_filters: true,
  theme: 'light',
  instruction_presets: DEFAULT_PRESETS,
  active_instruction_preset_id: DEFAULT_PRESETS[0].id,
  navigate_after_move: false,
  default_priority: 'med',
};

// Read-only. Mutations live in './actions' (Server Actions).
export async function fetchSettings(
  userId: string,
): Promise<UserSettings | null> {
  const { data } = await supabase
    .from('user_settings')
    .select(
      'default_sort, remember_filters, theme, instruction_presets, active_instruction_preset_id, navigate_after_move, default_priority',
    )
    .eq('user_id', userId)
    .single();
  return data as UserSettings | null;
}
