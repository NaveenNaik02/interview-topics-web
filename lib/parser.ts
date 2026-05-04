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
