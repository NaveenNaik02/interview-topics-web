import type { User } from '@supabase/supabase-js';
import type { StarredQuestion } from '@/features/starred/db/db';
import {
  sectionUrl,
  findGroupForSection,
  type SectionMeta,
  type TopicGroup,
} from '@/lib/topics';

// One starred question plus everything derived from it (topic lookup, url,
// permission check) — computed once, never inside a render map.
export interface StarredRow {
  q: StarredQuestion;
  section: SectionMeta;
  subKey: string;
  topicLabel: string;
  canManage: boolean;
}

// Pure — no hooks, no JSX, no server-action imports — kept in its own
// module so it (and its test) don't drag in StarredQuestionList's
// client/server-action imports.
export function buildStarredRows(
  questions: StarredQuestion[],
  groups: TopicGroup[],
  mounted: boolean,
  user: User | null,
): StarredRow[] {
  return questions.map((q) => {
    const section: SectionMeta = {
      topic: q.topic,
      file: q.file,
      label: q.label,
    };
    const group = findGroupForSection(groups, section);
    return {
      q,
      section,
      subKey: sectionUrl(section),
      topicLabel: group?.groupName ?? q.groupSlug,
      canManage:
        mounted &&
        !!user &&
        (q.createdBy === user.id || user.app_metadata?.is_admin === true),
    };
  });
}
