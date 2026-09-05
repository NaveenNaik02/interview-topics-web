import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { SectionMeta } from '@/lib/content/topics';

// Server-only: seeds a section page's manual order without touching Supabase
// directly. Split out of questionPosition.ts because that file is also imported
// by the client-side Zustand store, and this one pulls in next/headers.
//
// Keyed off the id prefix rather than the ids themselves — ids are
// `{topic}/{file}/u-{uuid}`, so the section identifies its own rows and this
// no longer has to wait for parseSection to resolve first. RLS scopes
// question_position to the caller, so there is no user filter here.
export async function fetchSectionOrder(
  section: SectionMeta,
): Promise<Record<string, number>> {
  const supabase = await createClient();
  // `_` and `%` are LIKE wildcards and the reserved `code_output` subtopic has
  // one, so the prefix is escaped rather than interpolated raw.
  const prefix = `${section.topic}/${section.file}/`.replace(
    /[\\%_]/g,
    '\\$&',
  );

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
