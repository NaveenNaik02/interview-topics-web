import type { SectionMeta } from '@/lib/topics'
import type { PriorityLevel } from '@/lib/offlineSync'
import type { ParsedQuestion } from '@/lib/parser'

export interface EditingQuestion {
  id: string
  title: string
  markdown: string
  section: SectionMeta
  priority: PriorityLevel | null
  lang?: string | null
  tags?: string | null
  problem?: string | null
}

export interface Props {
  defaultSection?: SectionMeta
  editing?: EditingQuestion
  // Seeds the title field for a fresh (non-edit) add — used when assigning
  // a captured Inbox item, so the raw pasted text lands in Question instead
  // of starting blank.
  prefillTitle?: string
  // Marks this Add flow as assigning the given Inbox item. On a successful
  // save, that item is deleted (it's become a real question) and the
  // header/footer copy calls this out instead of the generic add/edit text.
  fromInboxId?: string
  // Seeds the answer/lang/tags/problem fields alongside prefillTitle — used
  // when assigning a Set aside item, which (unlike a captured Inbox item)
  // already has a full question+answer, just needs a new topic/subtopic.
  prefillMarkdown?: string
  prefillLang?: string | null
  prefillTags?: string | null
  prefillProblem?: string | null
  // Marks this Add flow as assigning the given Set aside item. On a
  // successful save, that item is removed from Set aside the same way
  // fromInboxId removes a captured Inbox item.
  fromSetAsideId?: string
  onClose: () => void
  onSaved: (question: ParsedQuestion, section: SectionMeta) => void
}

export interface AnswerVersion {
  id: string
  label: string
  text: string
}

// Answer drafts are pure in-memory session state — never persisted, so
// closing the modal always throws them away. Only the last 2 generated
// drafts are kept (oldest dropped first); "Original" (the answer as it was
// when the modal opened, for edits) is pinned and never evicted by that cap.
export const MAX_ANSWER_DRAFTS = 2

export const PRIORITY_OPTIONS: { level: PriorityLevel; label: string }[] = [
  { level: 'high', label: 'High' },
  { level: 'med', label: 'Med' },
  { level: 'low', label: 'Low' },
]

export const LANG_OPTIONS = ['js', 'jsx', 'ts', 'html', 'css', 'bash', 'none']

export const AQ_MODEL_KEY = 'prep-tracker:ai-model'

// Sentinel select values for a suggested topic/subtopic that doesn't exist
// yet — nothing is created in the database until Save, so these stand in
// for a real slug/sectionKey until then.
export const PENDING_GROUP_SLUG = '__pending-topic__'
export const PENDING_SECTION_KEY = '__pending-section__'

export type PendingPlacement =
  | { kind: 'new-subtopic'; groupSlug: string; label: string }
  | { kind: 'new-topic'; topicName: string; blurb: string; label: string }
