import 'server-only'
import { cache } from 'react'
import { supabasePublic as supabase } from './supabase/public'
import type { SectionMeta } from './topics'

export interface ParsedQuestion {
  id: string
  number: number
  title: string
  bodyHtml: string
  markdown?: string | null
  createdBy?: string | null
  lang?: string | null
  tags?: string | null
  problem?: string | null
}

export async function countQuestions(section: SectionMeta): Promise<number> {
  const { count } = await supabase
    .from('questions')
    .select('*', { count: 'exact', head: true })
    .eq('topic', section.topic)
    .eq('file', section.file)
  return count ?? 0
}

export async function fetchAllCounts(): Promise<Record<string, number>> {
  // Fetch only topic and file for all questions and count them in memory
  // This is much faster than 50 separate count queries
  const { data, error } = await supabase
    .from('questions')
    .select('topic, file')
  
  if (error || !data) return {}

  const counts: Record<string, number> = {}
  data.forEach(r => {
    const key = `/${r.topic}/${r.file}`
    counts[key] = (counts[key] || 0) + 1
  })
  return counts
}

// Cached per-request: layout.tsx (Sidebar) and page.tsx (DashboardClient) both
// need this on every "/" request, and it's otherwise fetched twice.
export const fetchAllQuestionIds = cache(async (): Promise<Record<string, string[]>> => {
  const { data } = await supabase
    .from('questions')
    .select('id, group_slug')

  const grouped: Record<string, string[]> = {}
  if (data) {
    for (const row of data) {
      if (!grouped[row.group_slug]) grouped[row.group_slug] = []
      grouped[row.group_slug].push(row.id)
    }
  }
  return grouped
})

export async function parseSection(section: SectionMeta): Promise<ParsedQuestion[]> {
  const { data } = await supabase
    .from('questions')
    .select('id, number, title, body_html, markdown, created_by, lang, tags, problem')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number')
  return (data ?? []).map(r => ({
    id: r.id,
    number: r.number,
    title: r.title,
    bodyHtml: r.body_html,
    markdown: r.markdown,
    createdBy: r.created_by,
    lang: r.lang,
    tags: r.tags,
    problem: r.problem,
  }))
}
