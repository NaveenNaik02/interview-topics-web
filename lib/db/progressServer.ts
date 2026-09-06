import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';

// Ids of the caller's completed questions, seeded into the store by the app
// layout so `stats` — every sidebar bar and the dashboard percentages — is
// right on the first render instead of computed against an empty map.
//
// Split from progress.ts, which keeps its browser client for the offline
// path's background refresh. RLS scopes `progress` to auth.uid(), so no user
// id and no client argument.
export const fetchProgressIds = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data } = await supabase.from('progress').select('question_id');
  return data?.map((r) => r.question_id as string) ?? [];
});
