'use client'

import { AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Check } from 'lucide-react'
import type { ParsedQuestion } from '@/lib/parser'
import { useFontSize } from '@/lib/FontSizeContext'

interface Props {
  question: ParsedQuestion
  isComplete: boolean
  onToggle: () => void
}

export default function QuestionCard({ question, isComplete, onToggle }: Props) {
  const { proseClass } = useFontSize()
  return (
    <AccordionItem
      value={question.id}
      className={`border rounded-lg px-4 transition-colors ${
        isComplete
          ? 'border-green-300 bg-green-50/40 dark:border-green-700 dark:bg-green-950/30'
          : 'border-border bg-card'
      }`}
    >
      <AccordionTrigger className="hover:no-underline py-4 gap-3">
        <div className="flex items-center gap-3 flex-1 text-left">
          <span className="text-muted-foreground text-xs font-mono tabular-nums w-6 shrink-0 text-right">
            {question.number}.
          </span>
          <span className="font-medium text-sm leading-snug">{question.title}</span>
          <div className="ml-auto shrink-0">
            {isComplete ? (
              <Badge variant="success">Done</Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">Not done</Badge>
            )}
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent>
        <div
          className={`prose ${proseClass} max-w-none dark:prose-invert prose-pre:bg-muted prose-pre:text-foreground prose-code:bg-muted prose-code:px-1 prose-code:rounded mt-1 mb-4`}
          dangerouslySetInnerHTML={{ __html: question.bodyHtml }}
        />
        <div className="flex justify-end py-2 border-t border-border/50">
          <Button
            size="sm"
            variant={isComplete ? 'secondary' : 'default'}
            onClick={e => {
              e.stopPropagation()
              onToggle()
            }}
          >
            <Check className="h-4 w-4 mr-2" />
            {isComplete ? 'Mark incomplete' : 'Mark complete'}
          </Button>
        </div>
      </AccordionContent>
    </AccordionItem>
  )
}
