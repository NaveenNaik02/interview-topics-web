'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteTopicGroup } from '@/lib/actions/topics';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Props {
  slug: string;
  label: string;
}

export default function DeleteTopicDialog({ slug, label }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTopicGroup(slug);
      router.replace('/');
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete — try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <ConfirmDialog
      open={true}
      danger
      title={`Delete "${label}"?`}
      message={`This permanently removes the "${label}" topic. Topics with questions can't be deleted — remove its questions first.`}
      confirmLabel={deleting ? 'Deleting…' : 'Delete'}
      error={deleteError}
      onConfirm={handleDelete}
      onCancel={() => router.replace('/')}
    />
  );
}
