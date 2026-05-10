import { TOPIC_GROUPS } from '@/lib/topics'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  return <DashboardClient groups={TOPIC_GROUPS} />
}
