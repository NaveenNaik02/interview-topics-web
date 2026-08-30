'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteQuestion } from '@/lib/actions/questions';
import SaveToast from './SaveToast';

export const useDeleteToast = () => {
  const router = useRouter();
  const [state, setState] = useState<'deleting' | 'done' | null>(null);
  const [count, setCount] = useState(1);

  const remove = async (id: string | string[]) => {
    setCount(Array.isArray(id) ? id.length : 1);
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

  const noun = count === 1 ? 'question' : `${count} questions`;
  const toast = state && (
    <SaveToast
      title={state === 'deleting' ? 'Deleting…' : 'Deleted'}
      detail={
        state === 'deleting'
          ? `Removing the ${noun}.`
          : `The ${noun} ${count === 1 ? 'has' : 'have'} been removed.`
      }
    />
  );

  return { remove, toast };
};
