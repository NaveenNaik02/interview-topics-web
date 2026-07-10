'use server'

import { createClient } from '@/lib/supabase/server'
import type { UserSettings } from '@/lib/db/settings'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function insertSettings(settings: UserSettings): Promise<void> {
  const { supabase, user } = await requireUser()
  // Upsert, not insert: bootstrap can race (e.g. React effect double-invoke
  // in dev, or two tabs mounting at once) and this must stay idempotent.
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...settings }, { onConflict: 'user_id', ignoreDuplicates: true })
  if (error) throw error
}

export async function upsertSetting(partial: Partial<UserSettings>): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: user.id, ...partial, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw error
}
