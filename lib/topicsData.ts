import 'server-only'
import { cache } from 'react'
import { supabasePublic as supabase } from './supabase/public'
import { TOPIC_GROUPS, type TopicGroup } from './topics'

// Merges user-added topics/subtopics (see lib/actions/topics.ts) into the
// static TOPIC_GROUPS array. Every reader of the curriculum's shape — routing,
// the sidebar, the dashboard, the Add Question topic/subtopic pickers —
// should go through this, not TOPIC_GROUPS directly, or newly-added topics
// won't show up. Cached per-request since layout.tsx and page.tsx both need
// it on every "/" request.
export const getAllGroups = cache(async (): Promise<TopicGroup[]> => {
  const [{ data: groupRows }, { data: sectionRows }] = await Promise.all([
    supabase.from('topic_groups').select('slug, group_name, blurb'),
    supabase.from('sections').select('topic, file, label, group_slug'),
  ])

  const dynamicGroups: TopicGroup[] = (groupRows ?? []).map(g => ({
    groupName: g.group_name,
    slug: g.slug,
    blurb: g.blurb ?? undefined,
    sections: [],
  }))

  const bySlug = new Map(dynamicGroups.map(g => [g.slug, g]))
  for (const s of sectionRows ?? []) {
    const group = bySlug.get(s.group_slug)
    if (!group) continue
    group.sections.push({ topic: s.topic, file: s.file, label: s.label })
  }

  return [...TOPIC_GROUPS, ...dynamicGroups]
})
