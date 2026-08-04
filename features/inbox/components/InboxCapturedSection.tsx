'use client';

import { useState } from 'react';
import { useProgress } from '@/lib/context/ProgressContext';
import AddQuestionModal from '@/components/AddQuestionModal';
import type { InboxItem } from '../db';
import InboxCapturedList from './InboxCapturedList';

interface Props {
  items: InboxItem[];
  // Parent owns the array (both tab buttons need both lists' lengths at
  // once) — this just tells it to drop an id, for both discard and
  // post-assign removal.
  onRemoveItem: (id: string) => void;
}

export default function InboxCapturedSection({ items, onRemoveItem }: Props) {
  const { removeInboxItem } = useProgress();
  const [assigning, setAssigning] = useState<InboxItem | null>(null);

  const handleDiscard = (id: string) => {
    onRemoveItem(id);
    removeInboxItem(id);
  };

  return (
    <>
      <InboxCapturedList
        items={items}
        onRemove={handleDiscard}
        onAssign={setAssigning}
      />

      {assigning && (
        <AddQuestionModal
          prefillTitle={assigning.text}
          fromInboxId={assigning.id}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            onRemoveItem(assigning.id);
            setAssigning(null);
          }}
        />
      )}
    </>
  );
}
