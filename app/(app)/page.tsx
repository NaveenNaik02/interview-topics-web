import { getAllGroups } from '@/lib/topicsData'
import DashboardClient from '@/components/DashboardClient'

export default async function Home() {
  const groups = await getAllGroups()
  return <DashboardClient groups={groups} />
}
