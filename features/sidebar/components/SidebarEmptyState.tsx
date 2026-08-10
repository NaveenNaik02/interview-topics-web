'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/SidebarIcons';
import AddTopicModal from '@/components/AddTopicModal';

export const SidebarEmptyState = () => {
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  return (
    <div className="sidebar-empty">
      <div className="sidebar-empty-note">
        No topics yet — everything you add lives here.
      </div>
      <button className="add-topic-row" onClick={() => setAdding(true)}>
        <Icon.Plus /> Add topic
      </button>

      {adding &&
        typeof document !== 'undefined' &&
        createPortal(
          <AddTopicModal
            initialMode="topic"
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              router.refresh();
            }}
          />,
          document.body,
        )}
    </div>
  );
};
