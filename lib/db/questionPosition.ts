import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { createClient } from '@/lib/supabase/server';

// Read-only. Mutations live in '@/lib/actions/questionPosition' (Server Actions).
export async function fetchQuestionPositions(
  userId: string,
): Promise<Record<string, number>> {
  return fetchQuestionPositionsForIds(supabase, userId);
}

// Same table, but callable with a caller-supplied client (e.g. the cookie-scoped
// server client) and narrowed to specific question ids — used by section pages
// to seed manual order server-side, so the list renders pre-sorted instead of
// jumping once the client store's own fetch resolves.
export async function fetchQuestionPositionsForIds(
  client: SupabaseClient,
  userId: string,
  questionIds?: string[],
): Promise<Record<string, number>> {
  if (questionIds && questionIds.length === 0) return {};

  let query = client
    .from('question_position')
    .select('question_id, position')
    .eq('user_id', userId);
  if (questionIds) {
    query = query.in('question_id', questionIds);
  }

  const { data } = await query;
  const store: Record<string, number> = {};
  data?.forEach((r) => {
    store[r.question_id] = r.position;
  });
  return store;
}

// Server-only: resolves the caller's own cookie-scoped client + user, so
// section pages can seed manual order without touching Supabase directly.
export async function fetchInitialSectionOrder(
  questionIds: string[],
): Promise<Record<string, number>> {
  if (questionIds.length === 0) return {};

  const client = await createClient();
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return {};

  return fetchQuestionPositionsForIds(client, user.id, questionIds);
}
