import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { findGroup, findSection, findGroupForSection, findPrevNextSections, sectionUrl, TOPIC_GROUPS } from '@/lib/topics'
import { parseSection, countQuestions } from '@/lib/parser'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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

    // Single-section group: redirect straight to the section
    if (group.sections.length === 1) {
      const s = group.sections[0]
      redirect(`/${s.topic}/${s.file}`)
    }

    const sections = await Promise.all(
      group.sections.map(async s => ({
        ...s,
        total: await countQuestions(s),
      }))
    )

    return (
      <div className="space-y-6">
        <div>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold mt-1">{group.groupName}</h1>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sections.map(section => (
            <Link key={`${section.topic}/${section.file}`} href={`/${section.topic}/${section.file}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{section.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{section.total} questions</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  // Multi-segment → section view
  const section = findSection(segments)
  if (!section) notFound()

  const [questions, parentGroup] = await Promise.all([
    parseSection(section),
    Promise.resolve(findGroupForSection(section)),
  ])

  const { prev, next } = findPrevNextSections(section)

  return (
    <div className="space-y-6">
      <div>
        {parentGroup && (
          <Link
            href={`/${parentGroup.slug}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← {parentGroup.groupName}
          </Link>
        )}
        <h1 className="text-2xl font-bold mt-1">{section.label}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{questions.length} questions</p>
      </div>

      <SectionClient section={section} questions={questions} />

      <div className="flex items-center justify-between pt-4 border-t border-border">
        {prev ? (
          <Link
            href={sectionUrl(prev)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{prev.label}</span>
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            href={sectionUrl(next)}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{next.label}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <div />
        )}
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
