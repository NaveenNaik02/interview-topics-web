'use server'

import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function upsertProgress(questionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('progress').upsert({ user_id: user.id, question_id: questionId })
  if (error) throw error
}

export async function deleteProgress(questionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('progress').delete().eq('user_id', user.id).eq('question_id', questionId)
  if (error) throw error
}

export async function bulkUpsertProgress(ids: string[]): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('progress').upsert(ids.map(id => ({ user_id: user.id, question_id: id })))
  if (error) throw error
}

export async function bulkDeleteProgress(ids: string[]): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('progress').delete().eq('user_id', user.id).in('question_id', ids)
  if (error) throw error
}

export async function deleteAllProgress(): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('progress').delete().eq('user_id', user.id)
  if (error) throw error
}
