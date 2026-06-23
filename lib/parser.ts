import 'server-only'
import { supabase } from './supabase'
import type { SectionMeta } from './topics'

export interface ParsedQuestion {
  id: string
  number: number
  title: string
  bodyHtml: string
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

export async function fetchAllQuestionIds(): Promise<Record<string, string[]>> {
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
}

export async function parseSection(section: SectionMeta): Promise<ParsedQuestion[]> {
  const { data } = await supabase
    .from('questions')
    .select('id, number, title, body_html')
    .eq('topic', section.topic)
    .eq('file', section.file)
    .order('number')
  return (data ?? []).map(r => ({
    id: r.id,
    number: r.number,
    title: r.title,
    bodyHtml: r.body_html,
  }))
}
