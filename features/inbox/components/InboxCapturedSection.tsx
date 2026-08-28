'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { AddQuestionModal } from '@/features/authoring';
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
  const removeInboxItem = useAppStore((s) => s.removeInboxItem);
  // Both buttons open the same modal; `auto` only picks which view it
  // starts on, since either can end up in the form.
  const [assigning, setAssigning] = useState<{
    item: InboxItem;
    auto: boolean;
  } | null>(null);

  const handleDiscard = (id: string) => {
    onRemoveItem(id);
    removeInboxItem(id);
  };

  return (
    <>
      <InboxCapturedList
        items={items}
        onRemove={handleDiscard}
        onAssign={(item) => setAssigning({ item, auto: false })}
        onAutoRun={(item) => setAssigning({ item, auto: true })}
      />

      {assigning && (
        <AddQuestionModal
          prefillTitle={assigning.item.text}
          fromInboxId={assigning.item.id}
          autoRun={assigning.auto}
          onDiscard={() => {
            handleDiscard(assigning.item.id);
            setAssigning(null);
          }}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            onRemoveItem(assigning.item.id);
            setAssigning(null);
          }}
        />
      )}
    </>
  );
}
