'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { isLocalSupabase } from '@/lib/utils'
import { getAllGroups } from '@/lib/topicsData'
import { slugify, uniqueSlug, type TopicGroup, type SectionMeta } from '@/lib/topics'

async function requireAuthor(action: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')
  if (user.is_anonymous && !isLocalSupabase()) throw new Error(`Sign in to ${action}`)
  return { supabase, user }
}

export interface AddTopicGroupInput {
  groupName: string
  blurb: string
}

// Creates a new top-level topic with no subtopics yet — mirrors how
// addQuestion in questions.ts writes straight to the shared `questions`
// table rather than anything client-local.
export async function addTopicGroup(input: AddTopicGroupInput): Promise<TopicGroup> {
  const { supabase, user } = await requireAuthor('add a topic')

  const groupName = input.groupName.trim()
  if (groupName.length < 2) throw new Error('Topic name is too short')
  const blurb = input.blurb.trim()

  const groups = await getAllGroups()
  const slug = uniqueSlug(slugify(groupName), new Set(groups.map(g => g.slug)))

  const { error } = await supabase.from('topic_groups').insert({
    slug,
    group_name: groupName,
    blurb: blurb || null,
    created_by: user.id,
  })
  if (error) throw error

  revalidatePath('/')

  return { groupName, slug, blurb: blurb || undefined, sections: [] }
}

export interface AddSectionInput {
  groupSlug: string
  label: string
}

// Adds a subtopic to an existing (static or previously-added) topic group.
// `topic` is always the parent group's slug — new sections don't need the
// nested `topic/subtopic` folder convention static content sometimes uses
// (e.g. "react/ecosystem"), just something stable and unique per group.
export async function addSection(input: AddSectionInput): Promise<{ section: SectionMeta; group: TopicGroup }> {
  const { supabase, user } = await requireAuthor('add a subtopic')

  const label = input.label.trim()
  if (label.length < 2) throw new Error('Subtopic name is too short')

  const groups = await getAllGroups()
  const group = groups.find(g => g.slug === input.groupSlug)
  if (!group) throw new Error('Unknown topic')

  const topic = group.slug
  const takenFiles = new Set(group.sections.filter(s => s.topic === topic).map(s => s.file))
  const file = uniqueSlug(slugify(label), takenFiles)

  const { error } = await supabase.from('sections').insert({
    topic,
    file,
    label,
    group_slug: group.slug,
    created_by: user.id,
  })
  if (error) throw error

  revalidatePath('/')
  revalidatePath(`/${group.slug}`)
  revalidatePath(`/${topic}/${file}`)

  const section: SectionMeta = { topic, file, label }
  return { section, group: { ...group, sections: [...group.sections, section] } }
}
