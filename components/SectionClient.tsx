'use client'

import { useProgress } from '@/lib/ProgressContext'
import type { ParsedQuestion } from '@/lib/parser'
import type { SectionMeta } from '@/lib/topics'
import QuestionCard from './QuestionCard'
import { Progress } from '@/components/ui/progress'
import { Accordion } from '@/components/ui/accordion'

interface Props {
  section: SectionMeta
  questions: ParsedQuestion[]
}

export default function SectionClient({ section, questions }: Props) {
  const { isComplete, toggle, sectionStats, mounted } = useProgress()
  const stats = sectionStats(section.topic, section.file, questions.length)
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Progress value={mounted ? pct : 0} className="flex-1 h-2" />
        <span className="text-sm text-muted-foreground tabular-nums">
          {mounted ? `${stats.done} / ${stats.total}` : `— / ${stats.total}`}
        </span>
      </div>

      <Accordion type="multiple" className="space-y-3">
        {questions.map(q => (
          <QuestionCard
            key={q.id}
            question={q}
            isComplete={isComplete(q.id)}
            onToggle={() => toggle(q.id)}
          />
        ))}
      </Accordion>
    </div>
  )
}
