'use server'

import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function upsertStarred(questionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('starred_questions').upsert({ user_id: user.id, question_id: questionId })
  if (error) throw error
}

export async function deleteStarred(questionId: string): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('starred_questions').delete().eq('user_id', user.id).eq('question_id', questionId)
  if (error) throw error
}
