import Link from 'next/link';
import { TopicGroup } from '@/lib/content/topics';
import TopicCardProgress from './TopicCardProgress';

interface TopicCardProps {
  group: TopicGroup;
}

export default function TopicCard({ group }: TopicCardProps) {
  const hasSections = group.sections.length > 0;

  return (
    <div className="topic-card">
      {/* Every route here is dynamic (owner-scoped, nothing cacheable), so a
          prefetch is a full server render. Scrolling the dashboard would
          otherwise fire one per card — and two per tool link, which only ever
          open a modal. Same reason the sidebar's links opt out. */}
      <Link href={`/${group.slug}`} className="tc-main" prefetch={false}>
        <div className="tc-head">
          <span className="tc-name">{group.groupName}</span>
          {hasSections && (
            <span className="tc-count">{group.sections.length} sections</span>
          )}
        </div>
        <p className="tc-blurb">{group.blurb}</p>
        {hasSections ? (
          <TopicCardProgress group={group} />
        ) : (
          <p className="tc-blurb" style={{ opacity: 0.7 }}>
            No subtopics yet
          </p>
        )}
      </Link>
    </div>
  );
}
