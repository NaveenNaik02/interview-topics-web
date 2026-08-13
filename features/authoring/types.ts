import type { SectionMeta } from '@/lib/topics';
import type { PlacementSuggestion } from '@/lib/actions/suggestPlacement';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { ParsedQuestion } from '@/lib/parser';

export interface EditingQuestion {
  id: string;
  title: string;
  markdown: string;
  section: SectionMeta;
  priority: PriorityLevel | null;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
}

// What the form collects. Matches the shape both addQuestion and
// updateQuestion take, so a caller's onSubmit can pass it straight through.
export interface QuestionInput {
  topic: string;
  file: string;
  title: string;
  markdown: string;
  lang: string;
  tags: string;
  problem: string;
  priority: PriorityLevel | null;
}

// The question fields QuestionFormModal starts from. Every key is optional;
// an omitted one falls back to the field's own empty default (priority falls
// back to the user's default_priority setting, so `null` — an explicit "no
// priority" — has to stay distinguishable from absent).
export interface QuestionDraft {
  title?: string | null;
  markdown?: string | null;
  lang?: string | null;
  tags?: string | null;
  problem?: string | null;
  priority?: PriorityLevel | null;
}

// The form knows nothing about adding vs. editing vs. assigning from Inbox —
// callers hand it its copy, its starting values, and what Save does.
export interface QuestionFormProps {
  // Dialog heading, also the aria-label.
  heading: string;
  // Explanatory line in the footer, left of the buttons.
  footNote: string;
  // Save button text in its idle state.
  submitLabel: string;
  initialSection?: SectionMeta;
  initial?: QuestionDraft;
  // When set, enables "Revert to original" on the question and pins an
  // "Original" answer draft — i.e. this form is editing existing content.
  original?: { title: string; markdown: string };
  // Excluded from the duplicate check: a question is never its own duplicate.
  excludeQuestionId?: string;
  // Resolved placement is passed alongside the values — the form creates any
  // staged new topic/subtopic itself, right before calling this.
  onSubmit: (input: QuestionInput, section: SectionMeta) => Promise<void>;
  onClose: () => void;
}

export interface AddQuestionModalProps {
  defaultSection?: SectionMeta;
  // Seeds the title field — used when assigning a captured Inbox item, so
  // the raw pasted text lands in Question instead of starting blank.
  prefillTitle?: string;
  // Marks this Add flow as assigning the given Inbox item. On a successful
  // save, that item is deleted (it's become a real question) and the
  // header/footer copy calls this out instead of the generic add text.
  fromInboxId?: string;
  // Seeds the answer/lang/tags/problem fields alongside prefillTitle — used
  // when assigning a Set aside item, which (unlike a captured Inbox item)
  // already has a full question+answer, just needs a new topic/subtopic.
  prefillMarkdown?: string;
  prefillLang?: string | null;
  prefillTags?: string | null;
  prefillProblem?: string | null;
  // Marks this Add flow as assigning the given Set aside item. On a
  // successful save, that item is removed from Set aside the same way
  // fromInboxId removes a captured Inbox item.
  fromSetAsideId?: string;
  onClose: () => void;
  onSaved: (question: ParsedQuestion, section: SectionMeta) => void;
}

export interface EditQuestionModalProps {
  editing: EditingQuestion;
  onClose: () => void;
  onSaved: (question: ParsedQuestion, section: SectionMeta) => void;
}

export interface AnswerVersion {
  id: string;
  label: string;
  text: string;
}

// Answer drafts are pure in-memory session state — never persisted, so
// closing the modal always throws them away. Only the last 2 generated
// drafts are kept (oldest dropped first); "Original" (the answer as it was
// when the modal opened, for edits) is pinned and never evicted by that cap.
export const MAX_ANSWER_DRAFTS = 2;

export const PRIORITY_OPTIONS: { level: PriorityLevel; label: string }[] = [
  { level: 'high', label: 'High' },
  { level: 'med', label: 'Med' },
  { level: 'low', label: 'Low' },
];

export const LANG_OPTIONS = ['js', 'jsx', 'ts', 'html', 'css', 'bash', 'none'];

export const AQ_MODEL_KEY = 'prep-tracker:ai-model';

// Sentinel select values for a suggested topic/subtopic that doesn't exist
// yet — nothing is created in the database until Save, so these stand in
// for a real slug/sectionKey until then.
export const PENDING_GROUP_SLUG = '__pending-topic__';
export const PENDING_SECTION_KEY = '__pending-section__';

// A staged topic/subtopic is always just the suggestion that produced it —
// nothing else in the modal can create one — so it's that type minus the
// case where the target already exists.
export type PendingPlacement = Exclude<
  PlacementSuggestion,
  { mode: 'existing' }
>;
