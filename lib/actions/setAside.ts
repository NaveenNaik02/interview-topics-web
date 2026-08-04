'use server';

import { revalidatePath } from 'next/cache';
import { requireAuthor } from '@/lib/supabase/user';
import type { SetAsideItem } from '@/lib/db/setAside';

// Section pages are ISR-cached — see the same helper in actions/questions.ts.
function revalidateSection(topic: string, file: string) {
  revalidatePath(`/${topic}/${file}`);
  revalidatePath(`/${topic}`);
}

// Kebab menu's "Set aside" — a softer sibling of deleteQuestion. Removes the
// row from `questions` the same way, but captures its full content into
// set_aside_items first (before deleting) so a failure in between leaves the
// question intact rather than losing it — the opposite ordering (delete then
// insert) would silently discard the content for good if the insert failed.
export async function setAsideQuestion(id: string): Promise<SetAsideItem> {
  const { supabase, user } = await requireAuthor('Sign in to set questions aside');

  const { data: existing } = await supabase
    .from('questions')
    .select(
      'title, markdown, body_html, lang, tags, problem, topic, file, label',
    )
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new Error('Question not found');

  const { data: inserted, error: insertError } = await supabase
    .from('set_aside_items')
    .insert({
      user_id: user.id,
      title: existing.title,
      markdown: existing.markdown ?? '',
      body_html: existing.body_html,
      lang: existing.lang,
      tags: existing.tags,
      problem: existing.problem,
      topic: existing.topic,
      file: existing.file,
      label: existing.label,
    })
    .select(
      'id, title, markdown, body_html, lang, tags, problem, topic, file, label, created_at',
    )
    .single();
  if (insertError || !inserted)
    throw insertError ?? new Error('Could not set aside — try again.');

  const { data: deleted, error: deleteError } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .select('topic, file')
    .single();
  if (deleteError || !deleted) {
    // Ownership check failed (RLS) — undo the insert so it doesn't linger
    // as an orphaned set-aside item for a question that's still in its topic.
    await supabase.from('set_aside_items').delete().eq('id', inserted.id);
    throw new Error('You can only set aside your own questions.');
  }

  // Best-effort cleanup, same as deleteQuestion — this is the current user's
  // own progress/priority/starred rows only.
  await supabase
    .from('progress')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', id);
  await supabase
    .from('priority')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', id);
  await supabase
    .from('starred_questions')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', id);

  revalidateSection(deleted.topic, deleted.file);
  revalidatePath('/inbox');

  return {
    id: inserted.id,
    title: inserted.title,
    markdown: inserted.markdown,
    bodyHtml: inserted.body_html,
    lang: inserted.lang,
    tags: inserted.tags,
    problem: inserted.problem,
    topic: inserted.topic,
    file: inserted.file,
    label: inserted.label,
    createdAt: inserted.created_at,
  };
}

export async function discardSetAsideItem(id: string): Promise<void> {
  const { supabase, user } = await requireAuthor('Sign in to set questions aside');
  const { error } = await supabase
    .from('set_aside_items')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);
  if (error) throw error;

  revalidatePath('/inbox');
}
