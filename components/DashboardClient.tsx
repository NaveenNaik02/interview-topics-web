'use client'

import Link from 'next/link'
import { useProgress } from '@/lib/ProgressContext'
import type { TopicGroup, SectionMeta } from '@/lib/topics'
import { Progress } from '@/components/ui/progress'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ResetButton from './ResetButton'

type SectionWithTotal = SectionMeta & { total: number }
type GroupWithTotals = Omit<TopicGroup, 'sections'> & { sections: SectionWithTotal[] }

export default function DashboardClient({ groups }: { groups: GroupWithTotals[] }) {
  const { sectionStats, allStats, mounted } = useProgress()

  const allSections = groups.flatMap(g => g.sections)
  const overall = allStats(allSections)
  const overallPct = overall.total ? Math.round((overall.done / overall.total) * 100) : 0

  return (
    <div className="space-y-10">
      {/* Overall progress header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Study Progress</h1>
          <ResetButton />
        </div>
        <div className="flex items-center gap-3">
          <Progress value={mounted ? overallPct : 0} className="flex-1 h-3" />
          <span className="text-sm text-muted-foreground tabular-nums w-32 text-right">
            {mounted ? `${overall.done} / ${overall.total}` : `— / ${overall.total}`} ({overallPct}%)
          </span>
        </div>
      </div>

      {/* Topic groups */}
      {groups.map(group => {
        const groupStats = allStats(group.sections)
        const groupPct = groupStats.total ? Math.round((groupStats.done / groupStats.total) * 100) : 0

        return (
          <div key={group.slug} className="space-y-3">
            <div className="flex items-center gap-3">
              <Link href={`/${group.slug}`} className="text-base font-semibold hover:underline">
                {group.groupName}
              </Link>
              <Progress value={mounted ? groupPct : 0} className="flex-1 h-2" />
              <span className="text-sm text-muted-foreground tabular-nums w-20 text-right">
                {mounted ? `${groupStats.done}/${groupStats.total}` : `—/${groupStats.total}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {group.sections.map(section => {
                const stats = sectionStats(section.topic, section.file, section.total)
                const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0
                const isDone = mounted && pct === 100

                return (
                  <Link
                    key={`${section.topic}/${section.file}`}
                    href={`/${section.topic}/${section.file}`}
                  >
                    <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${isDone ? 'border-green-300' : ''}`}>
                      <CardHeader className="pb-2 pt-4 px-4">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                          {isDone ? (
                            <Badge variant="success" className="shrink-0">Done</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground shrink-0">{section.total}Q</span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="flex items-center gap-2">
                          <Progress value={mounted ? pct : 0} className="flex-1 h-1.5" />
                          <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                            {mounted ? `${pct}%` : '—'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
