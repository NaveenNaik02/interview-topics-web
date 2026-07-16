import { getAllGroups } from '@/lib/topicsData'
import { fetchAllQuestionIds } from '@/lib/parser'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  const [groups, questionIds] = await Promise.all([getAllGroups(), fetchAllQuestionIds()])
  return <DashboardClient groups={groups} questionIds={questionIds} />
}
