'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/supabase/user';
import type { InboxItem } from '../db';

// Deliberately allows anonymous users (unlike addQuestion/addTopicGroup) —
// inbox items are private per-user scratch notes, not shared authored
// content, so there's no reason to gate zero-friction capture behind sign-in.
export async function addInboxItem(text: string): Promise<InboxItem> {
  const { supabase, user } = await requireUser();

  const trimmed = text.trim();
  if (trimmed.length < 4) throw new Error('Write a bit more before saving');

  const { data, error } = await supabase
    .from('inbox_items')
    .insert({ user_id: user.id, text: trimmed })
    .select('id, text, created_at')
    .single();
  if (error || !data) throw error ?? new Error('Could not save — try again.');

  revalidatePath('/inbox');
  return { id: data.id, text: data.text, createdAt: data.created_at };
}

// Bulk counterpart of addInboxItem, used when an AI split turns one paste
// into several questions — same anonymous-allowed policy, one round trip.
export async function addInboxItems(texts: string[]): Promise<InboxItem[]> {
  const { supabase, user } = await requireUser();

  const trimmed = texts.map((t) => t.trim()).filter((t) => t.length >= 4);
  if (trimmed.length === 0) throw new Error('Nothing to save');

  const { data, error } = await supabase
    .from('inbox_items')
    .insert(trimmed.map((text) => ({ user_id: user.id, text })))
    .select('id, text, created_at');
  if (error || !data) throw error ?? new Error('Could not save — try again.');

  revalidatePath('/inbox');
  return data.map((d) => ({ id: d.id, text: d.text, createdAt: d.created_at }));
}

export async function deleteInboxItem(id: string): Promise<void> {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from('inbox_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;

  revalidatePath('/inbox');
}
