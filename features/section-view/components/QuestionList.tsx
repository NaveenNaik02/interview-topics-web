'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Code2 } from 'lucide-react';
import { useAppStore } from '@/lib/stores/appStore';
import { useShallow } from 'zustand/react/shallow';
import QuestionItem, {
  QuestionAnswerBody,
  StarButton,
  stripHtml,
} from '@/components/QuestionItem';
import RowActions from '@/components/RowActions';
import SaveToast from '@/components/SaveToast';
import { useDeleteToast } from '@/components/useDeleteToast';
import { setAsideQuestion } from '@/lib/actions/setAside';
import { useSectionDrag } from '../hooks';
import {
  sectionUrl,
  findGroupForSection,
  isCodeOutputSection,
  type SectionMeta,
} from '@/lib/content/topics';
import type { ParsedQuestion } from '@/lib/content/parser';
import type { PriorityLevel } from '@/lib/types';
import type {
  EditingCodeQuestion,
  EditingQuestion,
} from '@/features/authoring';
import { canManage } from '../canManage';

const EditQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.EditQuestionModal),
  {
    ssr: false,
  },
);
const CodeQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.CodeQuestionModal),
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
  const { remove, toast: deleteToast } = useDeleteToast();

  // Internal component states for tracking open question, editor/mover modals, and status toasts
  const [openId, setOpenId] = useState<string | null>(null);
  // Code-output rows are the snippet itself, so the whole section starts
  // expanded and clicking collapses — tracking what's *closed* keeps newly
  // added questions open without reseeding from the list.
  const codeSection = isCodeOutputSection(section);
  const [closedIds, setClosedIds] = useState<ReadonlySet<string>>(new Set());
  const [editingQuestion, setEditingQuestion] =
    useState<EditingQuestion | null>(null);
  const [editingCode, setEditingCode] = useState<EditingCodeQuestion | null>(
    null,
  );
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
    totals,
    setSectionTotal,
    navigateAfterMove,
    toggle,
    updateQuestionPriority,
    toggleQuestionStarred,
    toggleQuestionGreyZone,
    clearFilters,
    selectMode,
    selectedIds,
    toggleSelected,
  } = useAppStore(
    useShallow((s) => ({
      mounted: s.mounted,
      store: s.store,
      user: s.user,
      appendSetAsideItem: s.appendSetAsideItem,
      renameProgressId: s.renameProgressId,
      renameOrderId: s.renameOrderId,
      setQuestionOrder: s.setQuestionOrder,
      totals: s.totals,
      setSectionTotal: s.setSectionTotal,
      navigateAfterMove: s.navigateAfterMove,
      toggle: s.toggle,
      updateQuestionPriority: s.updateQuestionPriority,
      toggleQuestionStarred: s.toggleQuestionStarred,
      toggleQuestionGreyZone: s.toggleQuestionGreyZone,
      clearFilters: s.clearFilters,
      selectMode: s.selectMode,
      selectedIds: s.selectedIds,
      toggleSelected: s.toggleSelected,
    })),
  );

  // Shared by the move modal and the edit modal — both can land a question in
  // a different subtopic, and both mint a new id when they do.
  const handleMoved = (
    oldId: string,
    newId: string,
    destination: SectionMeta,
  ) => {
    const changedSection =
      destination.topic !== section.topic ||
      destination.file !== section.file;
    if (!changedSection) {
      router.refresh();
      return;
    }

    renameProgressId(oldId, newId);
    renameOrderId(oldId, newId);
    // The destination section isn't mounted, so nothing else will refresh its
    // total — without this its sidebar count stays stale until it's visited.
    const destUrl = sectionUrl(destination);
    setSectionTotal(destUrl, (totals[destUrl] ?? 0) + 1);

    if (navigateAfterMove) {
      router.push(destUrl);
    } else {
      const destGroup = findGroupForSection(groups, destination);
      setMoveToast(`${destGroup?.groupName ?? ''} → ${destination.label}`);
      setTimeout(() => setMoveToast(null), 3600);
    }
    router.refresh();
  };

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
            const manageable = mounted && canManage(q, user);
            const isDone = mounted && !!store[q.id];
            return (
              <QuestionItem
                key={q.id}
                id={q.id}
                title={q.title}
                icon={q.code ? <Code2 size={14} /> : undefined}
                isDone={isDone}
                isOpen={codeSection ? !closedIds.has(q.id) : openId === q.id}
                isSelected={selectedIds.has(q.id)}
                onToggleSelect={
                  selectMode && manageable ? () => toggleSelected(q.id) : undefined
                }
                priority={priority}
                reorderable={reorderable}
                onHandlePointerDown={handlePointerDown(q.id)}
                onToggleOpen={() => {
                  if (!codeSection) {
                    setOpenId(openId === q.id ? null : q.id);
                    return;
                  }
                  setClosedIds((prev) => {
                    const next = new Set(prev);
                    if (!next.delete(q.id)) next.add(q.id);
                    return next;
                  });
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
                      isGreyZone={!!q.greyZone}
                      onToggleGreyZone={() => toggleQuestionGreyZone(q.id, !!q.greyZone)}
                      priority={priority}
                      onSetPriority={(level) => updateQuestionPriority(q.id, level)}
                      onEdit={
                        manageable
                          ? async () => {
                              if (q.code) {
                                setEditingCode({
                                  id: q.id,
                                  title: q.title,
                                  lang: q.lang ?? null,
                                  code: q.code,
                                  output: q.output ?? null,
                                  markdown: q.markdown ?? '',
                                  priority,
                                });
                                return;
                              }
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
                        manageable
                          ? () =>
                              setMovingQuestion({ id: q.id, label: q.title })
                          : undefined
                      }
                      onSetAside={
                        manageable
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
                        manageable ? () => remove(q.id) : undefined
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
            setMovingQuestion(null);
            handleMoved(movingQuestion.id, newId, destination);
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

      {editingCode && (
        <CodeQuestionModal
          section={section}
          editing={editingCode}
          onClose={() => setEditingCode(null)}
          onSaved={() => {
            setEditingCode(null);
            router.refresh();
          }}
        />
      )}

      {editingQuestion && (
        <EditQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onDeleted={(id) => {
            setEditingQuestion(null);
            remove(id);
          }}
          onSaved={(question, newSection) => {
            setEditingQuestion(null);
            handleMoved(editingQuestion.id, question.id, newSection);
          }}
        />
      )}
    </>
  );
}
