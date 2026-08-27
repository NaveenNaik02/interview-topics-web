import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchShortlistQuestions } from '@/lib/db/shortlist';

// Read-only. The write side is setStarred in '@/lib/actions/questionFlags'.
export const fetchStarredQuestions = (client: SupabaseClient) => {
  return fetchShortlistQuestions(client, 'starred');
};
