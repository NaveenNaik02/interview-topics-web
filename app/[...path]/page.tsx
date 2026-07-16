import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { findGroup, findSection, findGroupForSection, findPrevNextSections, sectionUrl } from '@/lib/topics'
import { getAllGroups } from '@/lib/topicsData'
import { parseSection, countQuestions } from '@/lib/parser'
import SectionClient from '@/components/SectionClient'

export const revalidate = 3600

interface Props {
  params: Promise<{ path: string[] }>
}

export default async function Page({ params }: Props) {
  const { path: segments } = await params
  const groups = await getAllGroups()

  // Single segment → topic overview
  if (segments.length === 1) {
    const group = findGroup(groups, segments[0])
    if (!group) notFound()

    // Redirect straight to the first section — a just-created topic with no
    // subtopics yet (see AddTopicModal) has nowhere to redirect to.
    const s = group.sections[0]
    if (!s) notFound()
    redirect(`/${s.topic}/${s.file}`)
  }

  // Multi-segment → section view
  const section = findSection(groups, segments)
  if (!section) notFound()

  const [questions, group] = await Promise.all([
    parseSection(section),
    Promise.resolve(findGroupForSection(groups, section)),
  ])

  if (!group) notFound()

  const { prev, next } = findPrevNextSections(groups, section)

  return (
    <div className="space-y-12">
      <SectionClient 
        section={section} 
        group={group} 
        questions={questions} 
      />

      <div className="content-wrapper !pt-0">
        <div className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
          {prev ? (
            <Link
              href={sectionUrl(prev)}
              className="flex flex-col gap-1 text-left group"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Previous</span>
              <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                {prev.label}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={sectionUrl(next)}
              className="flex flex-col gap-1 text-right group"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">Next</span>
              <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                {next.label}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  )
}

export async function generateStaticParams() {
  const groups = await getAllGroups()
  const paths: { path: string[] }[] = []

  for (const group of groups) {
    if (group.sections.length > 0) paths.push({ path: [group.slug] })
    for (const section of group.sections) {
      paths.push({ path: [...section.topic.split('/'), section.file] })
    }
  }

  return paths
}
