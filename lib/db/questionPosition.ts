import { supabase } from '@/lib/supabase/client'

// Read-only. Mutations live in '@/lib/actions/questionPosition' (Server Actions).
export async function fetchQuestionPositions(userId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('question_position')
    .select('question_id, position')
    .eq('user_id', userId)
  const store: Record<string, number> = {}
  data?.forEach(r => { store[r.question_id] = r.position })
  return store
}
