import 'server-only';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { ShortlistFlag } from './shortlist';

export interface BadgeCounts {
  flagCounts: Record<ShortlistFlag, number>;
  inboxCount: number;
  setAsideCount: number;
}

// The four Sidebar badge numbers, read server-side and seeded into the store
// so the badges are right on first paint instead of counting up from 0 after
// four client round-trips. Row counts only — every list's bodies are fetched
// page-side by the page that shows them.
//
// RLS scopes all three tables to the caller, so none of these need a user id,
// and the client is served from here rather than passed in — same shape as
// getAllGroups() / fetchAllCounts().
export const fetchBadgeCounts = cache(async (): Promise<BadgeCounts> => {
  const supabase = await createClient();

  const countOf = async (table: string, flag?: ShortlistFlag) => {
    const rows = supabase.from(table).select('id', { count: 'exact', head: true });
    const { count } = await (flag ? rows.eq(flag, true) : rows);
    return count ?? 0;
  };

  const [starred, greyZone, inboxCount, setAsideCount] = await Promise.all([
    countOf('questions', 'starred'),
    countOf('questions', 'grey_zone'),
    countOf('inbox_items'),
    countOf('set_aside_items'),
  ]);

  return {
    flagCounts: { starred, grey_zone: greyZone },
    inboxCount,
    setAsideCount,
  };
});
