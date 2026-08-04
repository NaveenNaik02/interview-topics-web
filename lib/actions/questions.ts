'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import { createClient } from '@/lib/supabase/server';
import { requireAuthor } from '@/lib/supabase/user';
import { findSection, findGroupForSection } from '@/lib/topics';
import { getAllGroups } from '@/lib/topicsData';
import type { ParsedQuestion } from '@/lib/parser';
import type { PriorityLevel } from '@/lib/offlineSync';

// Section pages are ISR-cached (`export const revalidate` in
// app/[...path]/page.tsx) — without this, a successful write is invisible
// until the cache naturally expires. Revalidates both the section itself and
// its topic overview (counts shown there would otherwise go stale too).
function revalidateSection(topic: string, file: string) {
  revalidatePath(`/${topic}/${file}`);
  revalidatePath(`/${topic}`);
}

export interface AddQuestionInput {
  topic: string;
  file: string;
  title: string;
  markdown: string;
  lang?: string;
  tags?: string;
  problem?: string;
  priority?: PriorityLevel | null;
  starred?: boolean;
}

// .q-body only defines heading styles for <h4> — remap every markdown
// heading level so user-authored answers match hand-authored ones.
function renderAnswerHtml(markdown: string): string {
  const raw = marked.parse(markdown, { breaks: true }) as string;
  const remapped = raw
    .replace(/<h[1-6]([^>]*)>/gi, '<h4$1>')
    .replace(/<\/h[1-6]>/gi, '</h4>');
  return DOMPurify.sanitize(remapped);
}

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// Migrates the current user's own progress row from a question's old id to
// its new one after a cross-section move — otherwise a question the user
// had already checked off would silently read as "not done" again once its
// id changes. starred/priority need no such migration: they're columns on
// the same questions row, and the update that mints the new id (`UPDATE
// questions SET id = newId ... WHERE id = oldId`) carries them along for
// free. Cross-user rows (e.g. someone else's completion on a shared ETL
// question) are out of scope: this app has no service-role client to touch
// rows outside the caller's own (same limitation noted on deleteQuestion's
// cleanup below).
async function carryOverProgress(
  supabase: SupabaseServerClient,
  userId: string,
  oldId: string,
  newId: string,
) {
  const { data: prog } = await supabase
    .from('progress')
    .select('user_id')
    .eq('user_id', userId)
    .eq('question_id', oldId)
    .maybeSingle();
  if (prog) {
    // progress has no UPDATE policy (row presence is the state) — insert the
    // new row before dropping the old one so a failure here can't lose it.
    await supabase
      .from('progress')
      .insert({ user_id: userId, question_id: newId });
    await supabase
      .from('progress')
      .delete()
      .eq('user_id', userId)
      .eq('question_id', oldId);
  }
}

export async function addQuestion(
  input: AddQuestionInput,
): Promise<ParsedQuestion> {
  const { supabase, user } = await requireAuthor(
    'Sign in to add your own questions',
  );

  // QuestionItem renders q.title via dangerouslySetInnerHTML (existing ETL
  // titles are plain text authored by the developer) — strip all tags so a
  // user-submitted title can't inject markup into other visitors' pages.
  const title = DOMPurify.sanitize(input.title.trim(), { ALLOWED_TAGS: [] });
  const markdown = input.markdown.trim();
  if (title.length < 4) throw new Error('Question is too short');
  if (markdown.length < 4) throw new Error('Answer is too short');

  const groups = await getAllGroups();
  const segments = [...input.topic.split('/'), input.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const bodyHtml = renderAnswerHtml(markdown);

  const { data: maxRow } = await supabase
    .from('questions')
    .select('number')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (maxRow?.number ?? 0) + 1;

  const id = `${section.topic}/${section.file}/u-${randomUUID()}`;

  const { error } = await supabase.from('questions').insert({
    id,
    topic: section.topic,
    file: section.file,
    number,
    title,
    body_html: bodyHtml,
    markdown,
    label: section.label,
    group_slug: group.slug,
    created_by: user.id,
    lang: input.lang?.trim() || null,
    tags: input.tags?.trim() || null,
    problem: input.problem?.trim() || null,
    starred: input.starred ?? false,
    priority: input.priority ?? null,
  });
  if (error) throw error;

  revalidateSection(section.topic, section.file);

  return { id, number, title, bodyHtml };
}

export async function updateQuestion(
  id: string,
  input: AddQuestionInput,
): Promise<ParsedQuestion> {
  const { supabase, user } = await requireAuthor(
    'Sign in to edit your questions',
  );

  const title = DOMPurify.sanitize(input.title.trim(), { ALLOWED_TAGS: [] });
  const markdown = input.markdown.trim();
  if (title.length < 4) throw new Error('Question is too short');
  if (markdown.length < 4) throw new Error('Answer is too short');

  const groups = await getAllGroups();
  const segments = [...input.topic.split('/'), input.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const { data: existing } = await supabase
    .from('questions')
    .select('topic, file, number')
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new Error('Question not found');

  const changedSection =
    existing.topic !== section.topic || existing.file !== section.file;

  let number = existing.number;
  if (changedSection) {
    const { data: maxRow } = await supabase
      .from('questions')
      .select('number')
      .eq('topic', section.topic)
      .eq('file', section.file)
      .order('number', { ascending: false })
      .limit(1)
      .maybeSingle();
    number = (maxRow?.number ?? 0) + 1;
  }

  // ids are namespaced by section ("{topic}/{file}/…") — the sidebar and
  // per-section progress counts rely on that prefix to attribute a completed
  // id to the right subtopic without loading every question client-side.
  // Leaving the old id in place after a cross-section move would silently
  // break that attribution (the question would count toward the OLD
  // subtopic's completion forever, and could never reach 100% in the new
  // one), so mint a fresh id whenever the section actually changes.
  const newId = changedSection
    ? `${section.topic}/${section.file}/u-${randomUUID()}`
    : id;

  const bodyHtml = renderAnswerHtml(markdown);

  const { data, error } = await supabase
    .from('questions')
    .update({
      id: newId,
      topic: section.topic,
      file: section.file,
      number,
      title,
      body_html: bodyHtml,
      markdown,
      label: section.label,
      group_slug: group.slug,
      lang: input.lang?.trim() || null,
      tags: input.tags?.trim() || null,
      problem: input.problem?.trim() || null,
      priority: input.priority ?? null,
    })
    .eq('id', id)
    .select('id, number, title, body_html')
    .single();

  // RLS scopes the update to created_by = auth.uid() — a mismatch surfaces
  // here as either an error or zero rows, not a thrown permission error.
  if (error || !data) throw new Error('You can only edit your own questions.');

  if (changedSection) await carryOverProgress(supabase, user.id, id, newId);

  revalidateSection(section.topic, section.file);
  if (changedSection) {
    revalidateSection(existing.topic, existing.file);
  }

  return {
    id: data.id,
    number: data.number,
    title: data.title,
    bodyHtml: data.body_html,
  };
}

export interface MoveQuestionDestination {
  topic: string;
  file: string;
}

// A lighter-weight sibling of updateQuestion for the kebab menu's "Move
// to…" action — only touches placement (topic/file/label/group_slug/
// number), leaving title/markdown/etc. untouched, so the picker doesn't
// need to load or resubmit the full question content just to relocate it.
export async function moveQuestion(
  id: string,
  dest: MoveQuestionDestination,
): Promise<{ id: string }> {
  const { supabase, user } = await requireAuthor('Sign in to move questions');

  const groups = await getAllGroups();
  const segments = [...dest.topic.split('/'), dest.file].filter(Boolean);
  const section = findSection(groups, segments);
  if (!section) throw new Error('Unknown topic/section');
  const group = findGroupForSection(groups, section);
  if (!group) throw new Error('Unknown topic/section');

  const { data: existing } = await supabase
    .from('questions')
    .select('topic, file')
    .eq('id', id)
    .maybeSingle();
  if (!existing) throw new Error('Question not found');

  const { data: maxRow } = await supabase
    .from('questions')
    .select('number')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle();
  const number = (maxRow?.number ?? 0) + 1;

  // Same reasoning as updateQuestion: the id's "{topic}/{file}/…" prefix is
  // what the client uses to attribute a completed question to its section,
  // so a move (always cross-section, per MoveQuestionModal's own guard) has
  // to mint a fresh id rather than just repointing topic/file/number.
  const newId = `${section.topic}/${section.file}/u-${randomUUID()}`;

  const { data, error } = await supabase
    .from('questions')
    .update({
      id: newId,
      topic: section.topic,
      file: section.file,
      number,
      label: section.label,
      group_slug: group.slug,
    })
    .eq('id', id)
    .select('id')
    .single();
  if (error || !data) throw new Error('You can only move your own questions.');

  await carryOverProgress(supabase, user.id, id, newId);

  revalidateSection(section.topic, section.file);
  revalidateSection(existing.topic, existing.file);

  return { id: data.id };
}

export async function deleteQuestion(id: string): Promise<void> {
  const { supabase, user } = await requireAuthor(
    'Sign in to delete your questions',
  );

  const { data, error } = await supabase
    .from('questions')
    .delete()
    .eq('id', id)
    .select('topic, file')
    .single();
  if (error || !data)
    throw new Error('You can only delete your own questions.');

  // Best-effort cleanup of the current user's own progress row for this
  // question (starred/priority are columns on the deleted row itself, so
  // they're already gone). Cross-user orphan cleanup is out of scope —
  // there's no service-role client in this app, and it's a rare edge case.
  await supabase
    .from('progress')
    .delete()
    .eq('user_id', user.id)
    .eq('question_id', id);

  revalidateSection(data.topic, data.file);
}
