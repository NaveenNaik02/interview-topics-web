'use server'

import { createClient } from '@/lib/supabase/server'
import type { PriorityLevel } from '@/lib/offlineSync'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function upsertPriority(questionId: string, level: PriorityLevel): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('priority').upsert({ user_id: user.id, question_id: questionId, level })
  if (error) throw error
}

export async function deletePriority(questionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('priority').delete().eq('user_id', user.id).eq('question_id', questionId)
  if (error) throw error
}

export async function bulkUpsertPriority(items: { questionId: string; level: PriorityLevel }[]): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('priority').upsert(
    items.map(i => ({ user_id: user.id, question_id: i.questionId, level: i.level }))
  )
  if (error) throw error
}

export async function bulkDeletePriority(ids: string[]): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('priority').delete().eq('user_id', user.id).in('question_id', ids)
  if (error) throw error
}
