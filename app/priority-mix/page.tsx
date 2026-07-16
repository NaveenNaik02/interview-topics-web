import { createClient } from '@/lib/supabase/server'
import PriorityMixClient, { type PriorityMixQuestion } from '@/components/PriorityMixClient'
import type { PriorityLevel } from '@/lib/offlineSync'

export default async function PriorityMixPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let questions: PriorityMixQuestion[] = []

  if (user) {
    const { data: priorityRows } = await supabase
      .from('priority')
      .select('question_id, level')
      .eq('user_id', user.id)

    const ids = (priorityRows ?? []).map(r => r.question_id)

    if (ids.length > 0) {
      const { data: rows } = await supabase
        .from('questions')
        .select('id, number, title, body_html, markdown, created_by, topic, file, label, group_slug, lang, tags, problem')
        .in('id', ids)

      const levelById = new Map((priorityRows ?? []).map(r => [r.question_id, r.level as PriorityLevel]))
      questions = (rows ?? []).map(r => ({
        id: r.id,
        number: r.number,
        title: r.title,
        bodyHtml: r.body_html,
        markdown: r.markdown,
        createdBy: r.created_by,
        topic: r.topic,
        file: r.file,
        label: r.label,
        groupSlug: r.group_slug,
        lang: r.lang,
        tags: r.tags,
        problem: r.problem,
        priority: levelById.get(r.id) ?? 'low',
      }))
    }
  }

  return <PriorityMixClient questions={questions} />
}
