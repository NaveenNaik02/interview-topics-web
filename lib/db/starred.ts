import { supabase } from '@/lib/supabase/client'

// Read-only. Mutations live in '@/lib/actions/starred' (Server Actions).
export async function fetchStarred(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('starred_questions')
    .select('question_id')
    .eq('user_id', userId)
  return data?.map(r => r.question_id) ?? []
}
