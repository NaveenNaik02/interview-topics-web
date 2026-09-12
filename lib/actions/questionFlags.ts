'use server';

import { requireUser } from '@/lib/supabase/user';
import type { PriorityLevel } from '@/lib/types';
import type { ShortlistFlag } from '@/lib/db/shortlist';

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

export async function setGreyZone(
  questionId: string,
  greyZone: boolean,
): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('questions')
    .update({ grey_zone: greyZone })
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

// Clears (or sets) a shortlist flag across many questions in one statement —
// the topic overview's "Unstar all" / "Clear grey zone". `flag` is a column
// name, so it's constrained to ShortlistFlag rather than a bare string.
export async function bulkSetFlag(
  ids: string[],
  flag: ShortlistFlag,
  value: boolean,
): Promise<void> {
  if (ids.length === 0) return;
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('questions')
    .update({ [flag]: value })
    .in('id', ids)
    .eq('created_by', user.id);
  if (error) throw error;
}
