'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import QuestionItem, {
  QuestionAnswerBody,
  StarButton,
  stripHtml,
} from '@/components/QuestionItem';
import RowActions from '@/components/RowActions';
import SaveToast from '@/components/SaveToast';
import { deleteQuestion } from '@/lib/actions/questions';
import { setAsideQuestion } from '@/lib/actions/setAside';
import { useSectionDrag } from '../hooks';
import {
  sectionUrl,
  findGroupForSection,
  type SectionMeta,
} from '@/lib/topics';
import type { ParsedQuestion } from '@/lib/parser';
import type { PriorityLevel } from '@/lib/offlineSync';
import type { EditingQuestion } from '@/features/authoring';

const EditQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.EditQuestionModal),
  {
    ssr: false,
  },
);
const MoveQuestionModal = dynamic(
  () => import('@/components/MoveQuestionModal'),
  {
    ssr: false,
  },
);

interface QuestionListProps {
  processed: {
    q: ParsedQuestion;
    origIdx: number;
    priority: PriorityLevel | null;
  }[];
  reorderable: boolean;
  section: SectionMeta;
}

export default function QuestionList({
  processed,
  reorderable,
  section,
}: QuestionListProps) {
  const router = useRouter();
  const groups = useAppStore((s) => s.groups);

  // Internal component states for tracking open question, editor/mover modals, and status toasts
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [movingQuestion, setMovingQuestion] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [asideToast, setAsideToast] = useState(false);
  const [moveToast, setMoveToast] = useState<string | null>(null);

  const {
    mounted,
    store,
    user,
    appendSetAsideItem,
    renameProgressId,
    renameOrderId,
    setQuestionOrder,
    navigateAfterMove,
    toggle,
    updateQuestionPriority,
    toggleQuestionStarred,
    clearFilters,
  } = useAppStore(
    useShallow((s) => ({
      mounted: s.mounted,
      store: s.store,
      user: s.user,
      appendSetAsideItem: s.appendSetAsideItem,
      renameProgressId: s.renameProgressId,
      renameOrderId: s.renameOrderId,
      setQuestionOrder: s.setQuestionOrder,
      navigateAfterMove: s.navigateAfterMove,
      toggle: s.toggle,
      updateQuestionPriority: s.updateQuestionPriority,
      toggleQuestionStarred: s.toggleQuestionStarred,
      clearFilters: s.clearFilters,
    })),
  );

  // Invoke the drag-to-reorder hook internally since all drag targets, refs, and IDs are self-contained here
  const { listRef, dragId, indicatorTop, handlePointerDown } = useSectionDrag({
    processed,
    setQuestionOrder,
  });

  return (
    <>
      <div className="questions-list" ref={listRef}>
        {processed.length === 0 ? (
          <div className="filter-empty">
            No questions match this filter.{' '}
            <button type="button" className="link-btn" onClick={clearFilters}>
              Clear filter
            </button>
          </div>
        ) : (
          processed.map(({ q, priority }) => {
            const canManage =
              mounted &&
              !!user &&
              (q.createdBy === user.id || user.app_metadata?.is_admin === true);
            const isDone = mounted && !!store[q.id];
            return (
              <QuestionItem
                key={q.id}
                id={q.id}
                title={q.title}
                isDone={isDone}
                isOpen={openId === q.id}
                priority={priority}
                reorderable={reorderable}
                onHandlePointerDown={handlePointerDown(q.id)}
                onToggleOpen={() => {
                  setOpenId(openId === q.id ? null : q.id);
                }}
                onToggleDone={() => {
                  toggle(q.id);
                }}
                actions={
                  <>
                    <StarButton
                      isStarred={!!q.starred}
                      onToggle={() => toggleQuestionStarred(q.id, !!q.starred)}
                    />
                    <RowActions
                      getText={() => stripHtml(q.title)}
                      isStarred={!!q.starred}
                      onToggleStar={() => toggleQuestionStarred(q.id, !!q.starred)}
                      priority={priority}
                      onSetPriority={(level) => updateQuestionPriority(q.id, level)}
                      onEdit={
                        canManage
                          ? async () => {
                              const markdown =
                                q.markdown ||
                                (
                                  await import('@/lib/htmlToMarkdown')
                                ).htmlToMarkdown(q.bodyHtml);
                              setEditingQuestion({
                                id: q.id,
                                title: q.title,
                                markdown,
                                section,
                                priority,
                                lang: q.lang,
                                tags: q.tags,
                                problem: q.problem,
                              });
                            }
                          : undefined
                      }
                      onMove={
                        canManage
                          ? () =>
                              setMovingQuestion({ id: q.id, label: q.title })
                          : undefined
                      }
                      onSetAside={
                        canManage
                          ? async () => {
                              const item = await setAsideQuestion(q.id);
                              appendSetAsideItem(item);
                              setAsideToast(true);
                              setTimeout(() => setAsideToast(false), 3600);
                              router.refresh();
                            }
                          : undefined
                      }
                      onDelete={
                        canManage
                          ? async () => {
                              await deleteQuestion(q.id);
                              router.refresh();
                            }
                          : undefined
                      }
                    />
                  </>
                }
              >
                <QuestionAnswerBody q={q} />
              </QuestionItem>
            );
          })
        )}
        {reorderable && dragId != null && indicatorTop != null && (
          <div
            className="drop-indicator"
            style={{ top: `${indicatorTop}px` }}
          />
        )}
      </div>

      {movingQuestion && (
        <MoveQuestionModal
          groups={groups}
          questionId={movingQuestion.id}
          label={movingQuestion.label}
          currentSection={section}
          onClose={() => setMovingQuestion(null)}
          onMoved={(destination, newId) => {
            const changedSection =
              destination.topic !== section.topic ||
              destination.file !== section.file;
            if (changedSection) {
              renameProgressId(movingQuestion.id, newId);
              renameOrderId(movingQuestion.id, newId);
            }
            setMovingQuestion(null);
            if (navigateAfterMove && changedSection) {
              router.push(sectionUrl(destination));
              router.refresh();
            } else if (changedSection) {
              const destGroup = findGroupForSection(groups, destination);
              setMoveToast(
                `${destGroup?.groupName ?? ''} → ${destination.label}`,
              );
              setTimeout(() => setMoveToast(null), 3600);
              router.refresh();
            } else {
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

      {editingQuestion && (
        <EditQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(question, newSection) => {
            const changedSection =
              newSection.topic !== section.topic ||
              newSection.file !== section.file;
            if (changedSection && editingQuestion) {
              renameProgressId(editingQuestion.id, question.id);
              renameOrderId(editingQuestion.id, question.id);
            }
            setEditingQuestion(null);
            if (navigateAfterMove && changedSection) {
              router.push(sectionUrl(newSection));
              router.refresh();
            } else if (changedSection) {
              const destGroup = findGroupForSection(groups, newSection);
              setMoveToast(
                `${destGroup?.groupName ?? ''} → ${newSection.label}`,
              );
              setTimeout(() => setMoveToast(null), 3600);
              router.refresh();
            } else {
              router.refresh();
            }
          }}
        />
      )}
    </>
  );
}
