'use server';

import { requireUser } from '@/lib/supabase/user';
import type { PriorityLevel } from '@/lib/offlineSync';

export async function setStarred(
  questionId: string,
  starred: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('questions')
    .update({ starred })
    .eq('id', questionId)
    .eq('created_by', user.id);
  if (error) throw error;
}

export async function setPriority(
  questionId: string,
  level: PriorityLevel | null,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('questions')
    .update({ priority: level })
    .eq('id', questionId)
    .eq('created_by', user.id);
  if (error) throw error;
}

export async function bulkSetPriority(
  items: { questionId: string; level: PriorityLevel }[],
): Promise<void> {
  const { supabase, user } = await requireUser();
  await Promise.all(
    items.map(({ questionId, level }) =>
      supabase
        .from('questions')
        .update({ priority: level })
        .eq('id', questionId)
        .eq('created_by', user.id),
    ),
  );
}

export async function bulkClearPriority(ids: string[]): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('questions')
    .update({ priority: null })
    .in('id', ids)
    .eq('created_by', user.id);
  if (error) throw error;
}
