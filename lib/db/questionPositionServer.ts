import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SectionMeta } from '@/lib/content/topics';

// Keyed off the id prefix, not the ids: ids are `{topic}/{file}/u-{uuid}`, so
// this needs no question list and can run alongside parseSection.
export async function fetchSectionOrder(
  section: Pick<SectionMeta, 'topic' | 'file'>,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  // `_` and `%` are LIKE wildcards and the reserved `code_output` subtopic has
  // one, so the prefix is escaped rather than interpolated raw.
  const prefix = `${section.topic}/${section.file}/`.replace(/[\\%_]/g, '\\$&');

  const { data, error } = await supabase
    .from('question_position')
    .select('question_id, position')
    .like('question_id', `${prefix}%`);

  if (error) {
    console.error('fetchSectionOrder:', error.message);
    return {};
  }

  const store: Record<string, number> = {};
  data?.forEach((r) => {
    store[r.question_id] = r.position;
  });
  return store;
}
