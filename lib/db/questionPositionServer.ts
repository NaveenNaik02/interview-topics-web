import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { fetchQuestionPositionsForIds } from '@/lib/db/questionPosition';

// Server-only: resolves the caller's own cookie-scoped client + user, so
// section pages can seed manual order without touching Supabase directly.
// Split out of questionPosition.ts because that file is also imported by the
// client-side Zustand store, and this one pulls in next/headers.
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
