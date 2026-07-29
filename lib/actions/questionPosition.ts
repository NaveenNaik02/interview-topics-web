'use server'

import { createClient } from '@/lib/supabase/server'

async function requireUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  return { supabase, user }
}

export async function bulkUpsertQuestionPosition(items: { questionId: string; position: number }[]): Promise<void> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('question_position').upsert(
    items.map(i => ({ user_id: user.id, question_id: i.questionId, position: i.position }))
  )
  if (error) throw error
}
