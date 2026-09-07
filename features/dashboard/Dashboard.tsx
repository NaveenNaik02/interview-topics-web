import { TopicGroup } from '@/lib/content/topics';
import { TopicCard, DashboardHero } from './components';

interface Props {
  groups: TopicGroup[];
}

export default function Dashboard({ groups }: Props) {
  return (
    <>
      <DashboardHero />

      <div className="dash-grid">
        {groups.map((group) => (
          <TopicCard key={group.slug} group={group} />
        ))}
      </div>
    </>
  );
}
