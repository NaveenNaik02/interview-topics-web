import 'server-only';
import { getUser } from '@/lib/supabase/user';
import { fetchQuestionPositionsForIds } from '@/lib/db/questionPosition';

// Server-only: seeds section pages' manual order without touching Supabase
// directly. Split out of questionPosition.ts because that file is also
// imported by the client-side Zustand store, and this one pulls in next/headers.
export async function fetchInitialSectionOrder(
  questionIds: string[],
): Promise<Record<string, number>> {
  if (questionIds.length === 0) return {};

  const { supabase: client, user } = await getUser();
  if (!user) return {};

  return fetchQuestionPositionsForIds(client, user.id, questionIds);
}
