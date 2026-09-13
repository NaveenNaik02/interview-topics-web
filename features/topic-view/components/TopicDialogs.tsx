'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TopicGroup } from '@/lib/content/topics';
import type { ShortlistFlag } from '@/lib/db/shortlist';
import { useAppStore } from '@/lib/stores/appStore';
import {
  renameTopicGroup,
  renameSection,
  deleteSection,
  deleteTopicGroup,
} from '@/lib/actions/topics';
import { bulkSetFlag } from '@/lib/actions/questionFlags';
import ConfirmDialog from '@/components/ConfirmDialog';
import AddTopicModal from '@/components/AddTopicModal';
import { FLAG_COPY } from '../flagCopy';
import type { Dialog } from '../types';
import { RenameDialog } from './RenameDialog';

interface Props {
  dialog: Dialog;
  group: TopicGroup;
  flagIds: Record<ShortlistFlag, string[]>;
  onClose: () => void;
}

export const TopicDialogs = ({ dialog, group, flagIds, onClose }: Props) => {
  const router = useRouter();
  const bumpFlagCount = useAppStore((s) => s.bumpFlagCount);
  const [error, setError] = useState<string | null>(null);

  // Every mutation below ends in router.refresh() — the server re-reads
  // getAllGroups()/fetchTopicFlagIds() and the store re-syncs from it.
  const save = async (fn: () => Promise<void>) => {
    await fn();
    onClose();
    router.refresh();
  };

  // ConfirmDialog has no error state of its own, so this owns it. RenameDialog
  // does, and calls `save` directly — swallowing here would leave its Save
  // button stuck on "Saving…" with nothing rendered to explain why.
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try {
      await save(fn);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  if (dialog.kind === 'add') {
    return (
      <AddTopicModal
        initialMode="subtopic"
        initialGroupSlug={group.slug}
        onClose={onClose}
        onSaved={() => {
          onClose();
          router.refresh();
        }}
      />
    );
  }

  if (dialog.kind === 'rename-topic') {
    return (
      <RenameDialog
        title="Rename topic"
        label="Topic name"
        initialName={group.groupName}
        initialBlurb={group.blurb ?? ''}
        onSave={(name, blurb) =>
          save(() => renameTopicGroup(group.slug, name, blurb))
        }
        onClose={onClose}
      />
    );
  }

  if (dialog.kind === 'rename-section') {
    const { topic, file, label } = dialog.section;
    return (
      <RenameDialog
        title="Rename subtopic"
        label="Subtopic name"
        initialName={label}
        onSave={(name) => save(() => renameSection(topic, file, name))}
        onClose={onClose}
      />
    );
  }

  if (dialog.kind === 'delete-topic') {
    return (
      <ConfirmDialog
        open
        danger
        requireText={group.groupName}
        title="Delete topic?"
        message={`This removes “${group.groupName}” and all its subtopics. Topics with questions can't be deleted — move or delete its questions first.`}
        confirmLabel="Delete topic"
        error={error}
        onConfirm={() =>
          run(async () => {
            await deleteTopicGroup(group.slug);
            router.replace('/');
          })
        }
        onCancel={onClose}
      />
    );
  }

  if (dialog.kind === 'delete-section') {
    const { topic, file, label } = dialog.section;
    return (
      <ConfirmDialog
        open
        danger
        title="Delete subtopic?"
        message={`This removes “${label}” from “${group.groupName}”. This can't be undone.`}
        confirmLabel="Delete subtopic"
        error={error}
        onConfirm={() => run(() => deleteSection(topic, file))}
        onCancel={onClose}
      />
    );
  }

  const { flag } = dialog;
  const { title, confirm, where } = FLAG_COPY[flag];
  const ids = flagIds[flag];
  const message = `This removes ${ids.length} question${
    ids.length === 1 ? '' : 's'
  } in “${group.groupName}” from ${where}.`;

  return (
    <ConfirmDialog
      open
      title={title}
      message={message}
      confirmLabel={confirm}
      error={error}
      onConfirm={() =>
        run(async () => {
          await bulkSetFlag(ids, flag, false);
          bumpFlagCount(flag, -ids.length);
        })
      }
      onCancel={onClose}
    />
  );
};
