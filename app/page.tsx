import { TOPIC_GROUPS } from '@/lib/topics'
import { countQuestions } from '@/lib/parser'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  const groups = await Promise.all(
    TOPIC_GROUPS.map(async group => ({
      ...group,
      sections: await Promise.all(
        group.sections.map(async section => ({
          ...section,
          total: await countQuestions(section),
        }))
      ),
    }))
  )

  return <DashboardClient groups={groups} />
}
