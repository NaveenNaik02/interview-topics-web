import { TOPIC_GROUPS } from '@/lib/topics'
import { fetchAllQuestionIds } from '@/lib/parser'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  const questionIds = await fetchAllQuestionIds()
  return <DashboardClient groups={TOPIC_GROUPS} questionIds={questionIds} />
}
