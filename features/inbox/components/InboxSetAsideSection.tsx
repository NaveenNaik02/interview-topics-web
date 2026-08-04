'use client';

import { useState } from 'react';
import { useProgress } from '@/lib/context/ProgressContext';
import { useTopicGroups } from '@/lib/context/TopicsContext';
import AddQuestionModal from '@/components/AddQuestionModal';
import type { SetAsideItem } from '@/lib/db/setAside';
import InboxSetAsideList from './InboxSetAsideList';

interface Props {
  items: SetAsideItem[];
  // Parent owns the array (both tab buttons need both lists' lengths at
  // once) — this just tells it to drop an id, for both discard and
  // post-assign removal.
  onRemoveItem: (id: string) => void;
}

export default function InboxSetAsideSection({ items, onRemoveItem }: Props) {
  const { removeSetAsideItem } = useProgress();
  const groups = useTopicGroups();
  const [assigningAside, setAssigningAside] = useState<SetAsideItem | null>(
    null,
  );

  const handleDiscard = (id: string) => {
    onRemoveItem(id);
    removeSetAsideItem(id);
  };

  return (
    <>
      <InboxSetAsideList
        items={items}
        groups={groups}
        onRemove={handleDiscard}
        onAssign={setAssigningAside}
      />

      {assigningAside && (
        <AddQuestionModal
          defaultSection={{
            topic: assigningAside.topic,
            file: assigningAside.file,
            label: assigningAside.label,
          }}
          prefillTitle={assigningAside.title}
          prefillMarkdown={assigningAside.markdown}
          prefillLang={assigningAside.lang}
          prefillTags={assigningAside.tags}
          prefillProblem={assigningAside.problem}
          fromSetAsideId={assigningAside.id}
          onClose={() => setAssigningAside(null)}
          onSaved={() => {
            onRemoveItem(assigningAside.id);
            setAssigningAside(null);
          }}
        />
      )}
    </>
  );
}
