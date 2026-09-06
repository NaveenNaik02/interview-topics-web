import 'server-only';
import { cache } from 'react';
import { createClient } from '../supabase/server';
import { type TopicGroup } from './topics';

// Every account only ever sees topics/sections it created — RLS on
// topic_groups/sections scopes reads to created_by = auth.uid() (see
// 20260802120000_owner_scoped_content_reads.sql), so this returns an empty
// array for a brand new account. Every reader of the curriculum's shape —
// routing, the sidebar, the dashboard, the Add Question topic/subtopic
// pickers — should go through this, not TOPIC_GROUPS directly. Cached
// per-request since layout.tsx and page.tsx both need it on every request.
export const getAllGroups = cache(async (): Promise<TopicGroup[]> => {
  const supabase = await createClient();
  // Both queries must be explicitly ordered. Unordered, Postgres returns heap
  // order, and an UPDATE rewrites the row to the end of the heap — so renaming
  // a topic or subtopic teleported it to the bottom of the sidebar, the
  // dashboard, and its topic page. created_at is the intent-preserving key,
  // but it's transaction-time: the 45-row backfill shares one value, so a
  // slug tiebreak is what actually makes the order deterministic.
  const [{ data: groupRows }, { data: sectionRows }] = await Promise.all([
    supabase
      .from('topic_groups')
      .select('slug, group_name, blurb')
      .order('created_at')
      .order('slug'),
    supabase
      .from('sections')
      .select('topic, file, label, group_slug')
      .order('created_at')
      .order('file'),
  ]);

  const groups: TopicGroup[] = (groupRows ?? []).map((g) => ({
    groupName: g.group_name,
    slug: g.slug,
    blurb: g.blurb ?? undefined,
    sections: [],
    custom: true,
  }));

  const bySlug = new Map(groups.map((g) => [g.slug, g]));
  for (const s of sectionRows ?? []) {
    const group = bySlug.get(s.group_slug);
    if (!group) continue;
    group.sections.push({
      topic: s.topic,
      file: s.file,
      label: s.label,
      custom: true,
    });
  }

  return groups;
});
