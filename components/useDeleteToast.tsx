'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteQuestion } from '@/lib/actions/questions';
import SaveToast from './SaveToast';

export const useDeleteToast = () => {
  const router = useRouter();
  const [state, setState] = useState<'deleting' | 'done' | null>(null);

  const remove = async (id: string) => {
    setState('deleting');
    try {
      await deleteQuestion(id);
    } catch (error) {
      setState(null);
      throw error;
    }
    setState('done');
    setTimeout(() => setState(null), 2400);
    router.refresh();
  };

  const toast = state && (
    <SaveToast
      title={state === 'deleting' ? 'Deleting…' : 'Deleted'}
      detail={
        state === 'deleting'
          ? 'Removing the question.'
          : 'The question has been removed.'
      }
    />
  );

  return { remove, toast };
};
