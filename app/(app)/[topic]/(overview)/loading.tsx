import { TopicOverviewSkeleton } from '@/features/topic-view';

// In a route group so this boundary covers the overview page only — a
// loading.tsx at [topic]/ would also wrap [topic]/[file], showing this
// skeleton on the way to a question page.
export default function Loading() {
  return <TopicOverviewSkeleton />;
}
