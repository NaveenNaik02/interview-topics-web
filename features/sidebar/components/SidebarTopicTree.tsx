'use client';

import { createPortal } from 'react-dom';
import { useAppStore } from '@/lib/stores/appStore';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useDeleteTarget } from '../hooks';
import { SidebarTopicGroup } from './SidebarTopicGroup';
import { SidebarEmptyState } from './SidebarEmptyState';

export const SidebarTopicTree = () => {
  const groups = useAppStore((s) => s.groups);
  const { target, error, deleting, request, confirm, cancel } =
    useDeleteTarget();

  if (groups.length === 0) return <SidebarEmptyState />;

  const isGroup = target?.kind === 'group';
  const noun = isGroup ? 'topic' : 'subtopic';

  return (
    <>
      {groups.map((group) => (
        <SidebarTopicGroup
          key={group.slug}
          group={group}
          onRequestDelete={request}
        />
      ))}

      {/* Portaled to body: this tree sits under .sidebar, which gets a mobile-drawer
          transform that would otherwise break the dialog's position:fixed. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <ConfirmDialog
            open={!!target}
            danger
            title={target ? `Delete "${target.label}"?` : ''}
            message={
              target
                ? `This permanently removes the "${target.label}" ${noun}. ${isGroup ? 'Topics' : 'Subtopics'} with questions can't be deleted — remove its questions first.`
                : ''
            }
            confirmLabel={deleting ? 'Deleting…' : 'Delete'}
            error={error}
            onConfirm={confirm}
            onCancel={cancel}
          />,
          document.body,
        )}
    </>
  );
};
