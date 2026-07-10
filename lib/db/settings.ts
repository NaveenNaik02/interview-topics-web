import { supabase } from '@/lib/supabase/client'
import type { SortMode } from '@/components/FilterSortToolbar'
import type { Theme } from '@/lib/ThemeContext'

export interface UserSettings {
  default_sort: SortMode
  remember_filters: boolean
  theme: Theme
}

// Read-only. Mutations live in '@/lib/actions/settings' (Server Actions).
export async function fetchSettings(userId: string): Promise<UserSettings | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('default_sort, remember_filters, theme')
    .eq('user_id', userId)
    .single()
  return data as UserSettings | null
}
