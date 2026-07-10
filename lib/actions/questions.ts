'use server'

import { randomUUID } from 'node:crypto'
import { marked } from 'marked'
import DOMPurify from 'isomorphic-dompurify'
import { createClient } from '@/lib/supabase/server'
import { findSection, findGroupForSection } from '@/lib/topics'
import { isLocalSupabase } from '@/lib/utils'
import type { ParsedQuestion } from '@/lib/parser'

export interface AddQuestionInput {
  topic: string
  file: string
  title: string
  markdown: string
}

// .q-body only defines heading styles for <h4> — remap every markdown
// heading level so user-authored answers match hand-authored ones.
function renderAnswerHtml(markdown: string): string {
  const raw = marked.parse(markdown, { breaks: true }) as string
  const remapped = raw.replace(/<h[1-6]([^>]*)>/gi, '<h4$1>').replace(/<\/h[1-6]>/gi, '</h4>')
  return DOMPurify.sanitize(remapped)
}

export async function addQuestion(input: AddQuestionInput): Promise<ParsedQuestion> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous && !isLocalSupabase()) throw new Error('Sign in to add your own questions')

  // QuestionItem renders q.title via dangerouslySetInnerHTML (existing ETL
  // titles are plain text authored by the developer) — strip all tags so a
  // user-submitted title can't inject markup into other visitors' pages.
  const title = DOMPurify.sanitize(input.title.trim(), { ALLOWED_TAGS: [] })
  const markdown = input.markdown.trim()
  if (title.length < 4) throw new Error('Question is too short')
  if (markdown.length < 4) throw new Error('Answer is too short')

  const segments = [...input.topic.split('/'), input.file].filter(Boolean)
  const section = findSection(segments)
  if (!section) throw new Error('Unknown topic/section')
  const group = findGroupForSection(section)
  if (!group) throw new Error('Unknown topic/section')

  const bodyHtml = renderAnswerHtml(markdown)

  const { data: maxRow } = await supabase
    .from('questions')
    .select('number')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()
  const number = (maxRow?.number ?? 0) + 1

  const id = `${section.topic}/${section.file}/u-${randomUUID()}`

  const { error } = await supabase.from('questions').insert({
    id,
    topic: section.topic,
    file: section.file,
    number,
    title,
    body_html: bodyHtml,
    label: section.label,
    group_slug: group.slug,
    created_by: user.id,
  })
  if (error) throw error

  return { id, number, title, bodyHtml }
}
