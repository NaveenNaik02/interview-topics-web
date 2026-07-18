import type { TopicGroup } from '@/lib/topics'
import type { PriorityLevel } from '@/lib/offlineSync'

export interface ProgressStats {
  completed: number
  total: number
  bySection: Record<string, { completed: number; total: number }>
}

// Same aggregation ProgressContext's `stats` useMemo did — pulled out so the
// store can call it directly instead of a hooks-based memo. Takes `groups`
// (the merged static + DB-backed topic tree) rather than importing the
// static TOPIC_GROUPS constant, so dynamically added topics/subtopics are
// reflected too.
export function computeStats(store: Record<string, boolean>, totals: Record<string, number>, groups: TopicGroup[]): ProgressStats {
  const bySection: Record<string, { completed: number; total: number }> = {}
  let totalCompleted = 0
  let totalQuestions = 0

  groups.forEach(group => {
    group.sections.forEach(section => {
      const url = `/${section.topic}/${section.file}`
      const prefix = `${section.topic}/${section.file}/`
      const completed = Object.keys(store).filter(k => k.startsWith(prefix) && store[k]).length
      const total = totals[url] || 0

      bySection[url] = { completed, total }
      totalCompleted += completed
      totalQuestions += total
    })
  })

  return {
    completed: totalCompleted,
    total: totalQuestions,
    bySection,
  }
}

export function computeSectionStats(
  store: Record<string, boolean>,
  topic: string,
  file: string,
  total: number
): { done: number; total: number } {
  const prefix = `${topic}/${file}/`
  const done = Object.keys(store).filter(k => k.startsWith(prefix) && store[k]).length
  return { done, total }
}

export function computePriorityStats(
  priorityStore: Record<string, PriorityLevel>,
  topic: string,
  file: string,
  total: number
): { high: number; med: number; low: number; none: number } {
  const prefix = `${topic}/${file}/`
  const out = { high: 0, med: 0, low: 0, none: 0 }
  Object.entries(priorityStore).forEach(([k, level]) => {
    if (k.startsWith(prefix)) out[level]++
  })
  out.none = Math.max(0, total - out.high - out.med - out.low)
  return out
}
