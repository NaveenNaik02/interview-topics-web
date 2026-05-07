import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { findGroup, findSection, findGroupForSection, findPrevNextSections, sectionUrl, TOPIC_GROUPS } from '@/lib/topics'
import { parseSection, countQuestions } from '@/lib/parser'
import SectionClient from '@/components/SectionClient'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ path: string[] }>
}

export default async function Page({ params }: Props) {
  const { path: segments } = await params

  // Single segment → topic overview
  if (segments.length === 1) {
    const group = findGroup(segments[0])
    if (!group) notFound()

    // Redirect straight to the first section
    const s = group.sections[0]
    redirect(`/${s.topic}/${s.file}`)
  }

  // Multi-segment → section view
  const section = findSection(segments)
  if (!section) notFound()

  const [questions, group] = await Promise.all([
    parseSection(section),
    Promise.resolve(findGroupForSection(section)),
  ])

  if (!group) notFound()

  const { prev, next } = findPrevNextSections(section)

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
  const paths: { path: string[] }[] = []

  for (const group of TOPIC_GROUPS) {
    paths.push({ path: [group.slug] })
    for (const section of group.sections) {
      paths.push({ path: [...section.topic.split('/'), section.file] })
    }
  }

  return paths
}
