import { supabase } from '@/lib/supabase/client'

// Read-only. Mutations live in '@/lib/actions/progress' (Server Actions).
export async function fetchProgress(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('progress')
    .select('question_id')
    .eq('user_id', userId)
  return data?.map(r => r.question_id) ?? []
}
