import { getAllGroups } from '@/lib/topicsData'
import { fetchAllCounts } from '@/lib/parser'
import { DashboardClient, DashboardEmptyState } from '@/features/dashboard'

export default async function Home() {
  const groups = await getAllGroups()

  if (groups.length === 0) {
    return <DashboardEmptyState />
  }

  const counts = await fetchAllCounts()
  const totalCount = Object.values(counts).reduce((a, b) => a + b, 0)

  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="dashboard-view">
      <header className="dash-hero">
        <div>
          <div className="dash-eyebrow">{today} · Curriculum</div>
          <h1 className="dash-title">Frontend interview prep, organized.</h1>
          <p className="dash-sub">
            A curated track across {totalCount} questions. Pick a topic, expand
            a question, mark it done. Your progress is saved in the cloud.
          </p>
        </div>
      </header>
      <DashboardClient groups={groups} />
    </div>
  )
}
