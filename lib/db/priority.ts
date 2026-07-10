import { supabase } from '@/lib/supabase/client'
import type { PriorityLevel } from '@/lib/offlineSync'

// Read-only. Mutations live in '@/lib/actions/priority' (Server Actions).
export async function fetchPriority(userId: string): Promise<Record<string, PriorityLevel>> {
  const { data } = await supabase
    .from('priority')
    .select('question_id, level')
    .eq('user_id', userId)
  const store: Record<string, PriorityLevel> = {}
  data?.forEach(r => { store[r.question_id] = r.level as PriorityLevel })
  return store
}
