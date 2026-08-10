'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteSection, deleteTopicGroup } from '@/lib/actions/topics';

export type DeleteTarget =
  | { kind: 'group'; slug: string; label: string }
  | { kind: 'section'; topic: string; file: string; label: string };

export const useDeleteTarget = () => {
  const router = useRouter();
  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const request = (next: DeleteTarget) => {
    setError(null);
    setTarget(next);
  };

  const confirm = async () => {
    if (!target) return;
    setDeleting(true);
    try {
      if (target.kind === 'group') await deleteTopicGroup(target.slug);
      else await deleteSection(target.topic, target.file);
      setTarget(null);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not delete — try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  return {
    target,
    error,
    deleting,
    request,
    confirm,
    cancel: () => setTarget(null),
  };
};
