import 'server-only';
import { createClient } from '../supabase/server';
import type { SectionMeta } from './topics';
import type { PriorityLevel } from '../offlineSync';

export interface ParsedQuestion {
  id: string;
  number: number;
  title: string;
  bodyHtml: string;
  markdown?: string | null;
  createdBy?: string | null;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
  // Set only on code-output questions — `code` is the discriminator, output
  // and the explanation (bodyHtml) are both optional on one.
  code?: string | null;
  output?: string | null;
  starred?: boolean;
  greyZone?: boolean;
  priority?: PriorityLevel | null;
}

export async function countQuestions(section: SectionMeta): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic', section.topic)
    .eq('file', section.file);
  return count ?? 0;
}

export async function fetchAllCounts(): Promise<Record<string, number>> {
  const supabase = await createClient();
  // Fetch only topic and file for all questions and count them in memory
  // This is much faster than 50 separate count queries
  const { data, error } = await supabase
    .from('questions')
    .select('topic, file');

  if (error || !data) return {};

  const counts: Record<string, number> = {};
  data.forEach((r) => {
    const key = `/${r.topic}/${r.file}`;
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

export async function parseSection(
  section: SectionMeta,
): Promise<ParsedQuestion[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('questions')
    .select(
      'id, number, title, body_html, markdown, created_by, lang, tags, problem, code, output, starred, grey_zone, priority',
    )
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number');
  return (data ?? []).map((r) => ({
    id: r.id,
    number: r.number,
    title: r.title,
    bodyHtml: r.body_html,
    markdown: r.markdown,
    createdBy: r.created_by,
    lang: r.lang,
    tags: r.tags,
    problem: r.problem,
    code: r.code,
    output: r.output,
    starred: r.starred,
    greyZone: r.grey_zone,
    priority: r.priority,
  }));
}
