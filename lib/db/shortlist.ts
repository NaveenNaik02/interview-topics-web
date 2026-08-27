import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { PriorityLevel } from '@/lib/offlineSync';

// The two hand-curated shortlists a question can be on. Spelled as the
// `questions` columns they are, so they pass straight into a query. Lives
// here rather than in either feature — the store's badge counts and both
// features read it.
export type ShortlistFlag = 'starred' | 'grey_zone';

export interface ShortlistQuestion {
  id: string;
  number: number;
  title: string;
  bodyHtml: string;
  markdown?: string | null;
  createdBy?: string | null;
  topic: string;
  file: string;
  label: string;
  groupSlug: string;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
  priority: PriorityLevel | null;
}

const SHORTLIST_COLUMNS =
  'id, number, title, body_html, markdown, created_by, topic, file, label, group_slug, lang, tags, problem, priority';

function mapRow(r: Record<string, unknown>): ShortlistQuestion {
  return {
    id: r.id as string,
    number: r.number as number,
    title: r.title as string,
    bodyHtml: r.body_html as string,
    markdown: r.markdown as string | null,
    createdBy: r.created_by as string | null,
    topic: r.topic as string,
    file: r.file as string,
    label: r.label as string,
    groupSlug: r.group_slug as string,
    lang: r.lang as string | null,
    tags: r.tags as string | null,
    problem: r.problem as string | null,
    priority: r.priority as PriorityLevel | null,
  };
}

// Read-only. Mutations live in '@/lib/actions/questionFlags' (Server Actions).
// Callable with a caller-supplied client (e.g. the cookie-scoped server
// client) instead of the browser singleton — RLS scopes this to the caller's
// own questions, so no userId param is needed.
export async function fetchShortlistQuestions(
  client: SupabaseClient,
  flag: ShortlistFlag,
): Promise<ShortlistQuestion[]> {
  const { data } = await client
    .from('questions')
    .select(SHORTLIST_COLUMNS)
    .eq(flag, true);
  return (data ?? []).map(mapRow);
}

// Badge-only read: row counts, no bodies. Used by the global store so every
// page pays for two numbers instead of every flagged question's content.
export async function fetchShortlistCounts(
  userId: string,
): Promise<Record<ShortlistFlag, number>> {
  const countOf = async (flag: ShortlistFlag) => {
    const { count } = await supabase
      .from('questions')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId)
      .eq(flag, true);
    return count ?? 0;
  };
  const [starred, greyZone] = await Promise.all([
    countOf('starred'),
    countOf('grey_zone'),
  ]);
  return { starred, grey_zone: greyZone };
}
