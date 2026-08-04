'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgress } from '@/lib/context/ProgressContext';
import { useTopicGroups } from '@/lib/context/TopicsContext';
import {
  sectionUrl,
  findGroupForSection,
  type SectionMeta,
} from '@/lib/topics';
import { setAsideQuestion } from '@/lib/actions/setAside';
import type { StarredQuestion } from '@/features/starred/db';
import StarredQuestionList, { type StarredRow } from './StarredQuestionList';
import AddQuestionModal, {
  type EditingQuestion,
} from '@/components/AddQuestionModal';
import MoveQuestionModal from '@/components/MoveQuestionModal';
import SaveToast from '@/components/SaveToast';
import { htmlToMarkdown } from '@/lib/htmlToMarkdown';

interface Props {
  questions: StarredQuestion[];
}

// A flat, manually-curated shortlist for a last-look pass right before an
// interview — orthogonal to priority/status, no filters, just the questions
// the user personally starred. Mirrors PriorityMixClient's question-list
// wiring (edit/move/delete/set-aside) minus its builder UI.
export default function StarredClient({ questions }: Props) {
  const { navigateAfterMove, appendSetAsideItem } = useProgress();
  const groups = useTopicGroups();
  const router = useRouter();
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [movingQuestion, setMovingQuestion] = useState<{
    id: string;
    label: string;
    section: SectionMeta;
  } | null>(null);
  const [moveToast, setMoveToast] = useState<string | null>(null);
  const [asideToast, setAsideToast] = useState(false);

  const handleEdit = ({ q, section }: StarredRow) =>
    setEditingQuestion({
      id: q.id,
      title: q.title,
      markdown: q.markdown || htmlToMarkdown(q.bodyHtml),
      section,
      priority: q.priority,
      lang: q.lang,
      tags: q.tags,
      problem: q.problem,
    });

  const handleMove = ({ q, section }: StarredRow) =>
    setMovingQuestion({ id: q.id, label: q.title, section });

  const handleSetAside = async ({ q }: StarredRow) => {
    const item = await setAsideQuestion(q.id);
    appendSetAsideItem(item);
    setAsideToast(true);
    setTimeout(() => setAsideToast(false), 3600);
    router.refresh();
  };

  return (
    <>
      <StarredQuestionList
        questions={questions}
        onEdit={handleEdit}
        onMove={handleMove}
        onSetAside={handleSetAside}
      />

      {editingQuestion && (
        <AddQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
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

      {moveToast && <SaveToast title="Moved" detail={moveToast} />}
      {asideToast && (
        <SaveToast
          title="Set aside"
          detail="Find it in Inbox whenever you're ready."
        />
      )}
    </>
  );
}
