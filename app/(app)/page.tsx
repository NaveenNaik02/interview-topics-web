import { getAllGroups } from '@/lib/content/topicsData';
import { Dashboard, DashboardEmptyState } from '@/features/dashboard';

interface HomeProps {
  searchParams: Promise<{
    'add-topic'?: string;
  }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const [groups, resolvedSearchParams] = await Promise.all([
    getAllGroups(),
    searchParams,
  ]);

  if (groups.length === 0) {
    return <DashboardEmptyState searchParams={resolvedSearchParams} />;
  }

  return (
    <div className="dashboard-view">
      <Dashboard groups={groups} />
    </div>
  );
}
