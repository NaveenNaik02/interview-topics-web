import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import type { PriorityLevel } from '@/lib/offlineSync';

export interface StarredQuestion {
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

const STARRED_COLUMNS =
  'id, number, title, body_html, markdown, created_by, topic, file, label, group_slug, lang, tags, problem, priority';

function mapRow(r: Record<string, unknown>): StarredQuestion {
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
export async function fetchStarredQuestions(): Promise<StarredQuestion[]> {
  return fetchStarredQuestionsWithClient(supabase);
}

// Same read, but callable with a caller-supplied client (e.g. the
// cookie-scoped server client) instead of the browser singleton — RLS scopes
// this to the caller's own questions, so no userId param is needed.
export async function fetchStarredQuestionsWithClient(
  client: SupabaseClient,
): Promise<StarredQuestion[]> {
  const { data } = await client
    .from('questions')
    .select(STARRED_COLUMNS)
    .eq('starred', true);
  return (data ?? []).map(mapRow);
}

// Badge-only read: row count, no bodies. Used by the global store so every
// page pays for a number instead of every starred question's full content.
export async function fetchStarredCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', userId)
    .eq('starred', true);
  return count ?? 0;
}
