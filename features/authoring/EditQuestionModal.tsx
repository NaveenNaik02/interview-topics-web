'use client';

import { updateQuestion } from '@/lib/actions/questions';
import { AuthoringProvider } from './store/AuthoringProvider';
import { QuestionFormModal } from './components/QuestionFormModal';
import type { EditQuestionModalProps } from './types';

// Editing an existing question. `original` is what turns on "Revert to
// original" and the pinned Original answer draft; `excludeQuestionId` keeps
// the duplicate check from matching the question against itself.
export const EditQuestionModal = ({
  editing,
  onClose,
  onSaved,
  onDeleted,
}: EditQuestionModalProps) => (
  <AuthoringProvider
    heading="Edit question"
    footNote="Saving updates this question in place, everywhere it appears."
    submitLabel="Save changes"
    initialSection={editing.section}
    initial={{
      title: editing.title,
      markdown: editing.markdown,
      lang: editing.lang,
      tags: editing.tags,
      problem: editing.problem,
      priority: editing.priority,
    }}
    original={{ title: editing.title, markdown: editing.markdown }}
    excludeQuestionId={editing.id}
    onSubmit={async (input, section) => {
      onSaved(await updateQuestion(editing.id, input), section);
    }}
    onClose={onClose}
    onDeleted={onDeleted}
  >
    <QuestionFormModal />
  </AuthoringProvider>
);
