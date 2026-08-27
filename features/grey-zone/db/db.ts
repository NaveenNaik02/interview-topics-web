import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchShortlistQuestions } from '@/lib/db/shortlist';

// Read-only. The write side is setGreyZone in '@/lib/actions/questionFlags'.
export const fetchGreyZoneQuestions = (client: SupabaseClient) => {
  return fetchShortlistQuestions(client, 'grey_zone');
};
