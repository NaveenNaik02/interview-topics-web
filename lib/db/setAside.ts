import { supabase } from '@/lib/supabase/client'

export interface SetAsideItem {
  id: string
  title: string
  markdown: string
  bodyHtml: string
  lang: string | null
  tags: string | null
  problem: string | null
  topic: string
  file: string
  label: string
  createdAt: string
}

// Read-only. Mutations live in '@/lib/actions/setAside' (Server Actions).
export async function fetchSetAsideItems(userId: string): Promise<SetAsideItem[]> {
  const { data } = await supabase
    .from('set_aside_items')
    .select('id, title, markdown, body_html, lang, tags, problem, topic, file, label, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return (data ?? []).map(r => ({
    id: r.id,
    title: r.title,
    markdown: r.markdown,
    bodyHtml: r.body_html,
    lang: r.lang,
    tags: r.tags,
    problem: r.problem,
    topic: r.topic,
    file: r.file,
    label: r.label,
    createdAt: r.created_at,
  }))
}
