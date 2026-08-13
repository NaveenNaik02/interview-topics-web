'use client';

import { useShallow } from 'zustand/react/shallow';
import { useAppStore } from '@/lib/stores/appStore';
import { addQuestion } from '@/lib/actions/questions';
import { AuthoringProvider } from './store/AuthoringProvider';
import { QuestionFormModal } from './components/QuestionFormModal';
import type { AddQuestionModalProps } from './types';

// Creating a brand-new question. Assigning a captured Inbox item or a
// Set aside item is the same flow with seeded fields plus a source row to
// clear on success — only the copy and that cleanup differ.
export const AddQuestionModal = ({
  defaultSection,
  prefillTitle,
  fromInboxId,
  prefillMarkdown,
  prefillLang,
  prefillTags,
  prefillProblem,
  fromSetAsideId,
  onClose,
  onSaved,
}: AddQuestionModalProps) => {
  const { removeInboxItem, removeSetAsideItem } = useAppStore(
    useShallow((s) => ({
      removeInboxItem: s.removeInboxItem,
      removeSetAsideItem: s.removeSetAsideItem,
    })),
  );

  return (
    <AuthoringProvider
      heading={
        fromInboxId
          ? 'Assign from Inbox'
          : fromSetAsideId
            ? 'Assign to a topic'
            : 'Add question'
      }
      footNote={
        fromInboxId
          ? 'Saves the question and removes it from your Inbox.'
          : fromSetAsideId
            ? 'Saves the question to the topic above and removes it from Set aside.'
            : 'Saving writes this question straight to the database — no file editing needed.'
      }
      submitLabel="Save question"
      initialSection={defaultSection}
      initial={{
        title: prefillTitle,
        markdown: prefillMarkdown,
        lang: prefillLang,
        tags: prefillTags,
        problem: prefillProblem,
      }}
      onSubmit={async (input, section) => {
        const question = await addQuestion(input);
        if (fromInboxId) removeInboxItem(fromInboxId);
        if (fromSetAsideId) removeSetAsideItem(fromSetAsideId);
        onSaved(question, section);
      }}
      onClose={onClose}
    >
      <QuestionFormModal />
    </AuthoringProvider>
  );
};
