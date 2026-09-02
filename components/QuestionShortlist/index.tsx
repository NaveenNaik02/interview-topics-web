'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/lib/stores/appStore';
import {
  sectionUrl,
  findGroupForSection,
  type SectionMeta,
} from '@/lib/content/topics';
import { setAsideQuestion } from '@/lib/actions/setAside';
import type { ShortlistQuestion, ShortlistFlag } from '@/lib/db/shortlist';
import ShortlistList, { type ShortlistRowData } from './ShortlistList';
import { EditQuestionModal, type EditingQuestion } from '@/features/authoring';
import MoveQuestionModal from '@/components/MoveQuestionModal';
import SaveToast from '@/components/SaveToast';
import { useDeleteToast } from '@/components/useDeleteToast';
import { htmlToMarkdown } from '@/lib/htmlToMarkdown';

interface Props {
  questions: ShortlistQuestion[];
  flag: ShortlistFlag;
  // Taking the question off this shortlist — the write and the badge bump
  // belong to whichever feature owns the flag, so they come in as a prop.
  onRemove: (id: string) => Promise<void>;
}

// A flat, manually-curated shortlist — starred (a last-look pass before the
// interview) or grey zone (still shaky) — orthogonal to priority/status, no
// filters. Mirrors PriorityMixClient's question-list wiring
// (edit/move/delete/set-aside) minus its builder UI.
export const QuestionShortlist = ({ questions, flag, onRemove }: Props) => {
  const navigateAfterMove = useAppStore((s) => s.navigateAfterMove);
  const appendSetAsideItem = useAppStore((s) => s.appendSetAsideItem);
  const groups = useAppStore((s) => s.groups);
  const router = useRouter();
  const { remove, toast: deleteToast } = useDeleteToast();
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [movingQuestion, setMovingQuestion] = useState<{
    id: string;
    label: string;
    section: SectionMeta;
  } | null>(null);
  const [moveToast, setMoveToast] = useState<string | null>(null);
  const [asideToast, setAsideToast] = useState(false);

  const handleEdit = useCallback(({ q, section }: ShortlistRowData) =>
    setEditingQuestion({
      id: q.id,
      title: q.title,
      markdown: q.markdown || htmlToMarkdown(q.bodyHtml),
      section,
      priority: q.priority,
      lang: q.lang,
      tags: q.tags,
      problem: q.problem,
    }), []);

  const handleMove = useCallback(({ q, section }: ShortlistRowData) =>
    setMovingQuestion({ id: q.id, label: q.title, section }), []);

  const handleSetAside = useCallback(async ({ q }: ShortlistRowData) => {
    const item = await setAsideQuestion(q.id);
    appendSetAsideItem(item);
    setAsideToast(true);
    setTimeout(() => setAsideToast(false), 3600);
    router.refresh();
  }, [appendSetAsideItem, router]);

  return (
    <>
      <ShortlistList
        questions={questions}
        flag={flag}
        onRemove={onRemove}
        onEdit={handleEdit}
        onMove={handleMove}
        onSetAside={handleSetAside}
      />

      {editingQuestion && (
        <EditQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onDeleted={(id) => {
            setEditingQuestion(null);
            remove(id);
          }}
          onSaved={() => {
            setEditingQuestion(null);
            router.refresh();
          }}
        />
      )}

      {movingQuestion && (
        <MoveQuestionModal
          groups={groups}
          questionId={movingQuestion.id}
          label={movingQuestion.label}
          currentSection={movingQuestion.section}
          onClose={() => setMovingQuestion(null)}
          onMoved={(destination) => {
            setMovingQuestion(null);
            if (navigateAfterMove) {
              router.push(sectionUrl(destination));
            } else {
              const destGroup = findGroupForSection(groups, destination);
              setMoveToast(
                `${destGroup?.groupName ?? ''} → ${destination.label}`,
              );
              setTimeout(() => setMoveToast(null), 3600);
              router.refresh();
            }
          }}
        />
      )}

      {deleteToast}
      {moveToast && <SaveToast title="Moved" detail={moveToast} />}
      {asideToast && (
        <SaveToast
          title="Set aside"
          detail="Find it in Inbox whenever you're ready."
        />
      )}
    </>
  );
};
