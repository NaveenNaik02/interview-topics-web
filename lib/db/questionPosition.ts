import type { SupabaseClient } from '@supabase/supabase-js';

// Read-only. Mutations live in '@/lib/actions/questionPosition' (Server Actions).
//
// Always narrowed to specific question ids: an unfiltered read of this table
// would be capped at PostgREST's max_rows with no error, and an arbitrary 1000
// of someone's positions is a silently wrong manual order, not a slow one.
export async function fetchQuestionPositionsForIds(
  client: SupabaseClient,
  userId: string,
  questionIds: string[],
): Promise<Record<string, number>> {
  if (questionIds.length === 0) return {};

  const { data } = await client
    .from('question_position')
    .select('question_id, position')
    .eq('user_id', userId)
    .in('question_id', questionIds);
  const store: Record<string, number> = {};
  data?.forEach((r) => {
    store[r.question_id] = r.position;
  });
  return store;
}
