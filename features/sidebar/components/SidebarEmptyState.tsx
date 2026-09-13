'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Icon } from '@/components/SidebarIcons';

// This component sits in the sidebar, which the app layout renders on every
// page — a static import would put AddTopicModal in the shared chunk for all
// of them and defeat the FAB's own lazy-load of the same modal.
const AddTopicModal = dynamic(() => import('@/components/AddTopicModal'), {
  ssr: false,
});

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
