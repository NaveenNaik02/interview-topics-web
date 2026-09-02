import Link from 'next/link';
import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { Icon } from '@/components/SidebarIcons';
import TopicCardProgress from './TopicCardProgress';

interface TopicCardProps {
  group: TopicGroup;
}

export default function TopicCard({ group }: TopicCardProps) {
  const firstSection = group.sections[0];

  const tcMain = (
    <>
      <div className="tc-head">
        <span className="tc-name">{group.groupName}</span>
        {firstSection && (
          <span className="tc-count">{group.sections.length} sections</span>
        )}
      </div>
      <p className="tc-blurb">{group.blurb}</p>
      {firstSection ? (
        <TopicCardProgress group={group} />
      ) : (
        <p className="tc-blurb" style={{ opacity: 0.7 }}>
          No subtopics yet
        </p>
      )}
    </>
  );

  return (
    <div className="topic-card">
      {firstSection ? (
        // Every route here is dynamic (owner-scoped, nothing cacheable), so a
        // prefetch is a full server render. Scrolling the dashboard would
        // otherwise fire one per card — and two per tool link, which only ever
        // open a modal. Same reason the sidebar's links opt out.
        <Link
          href={sectionUrl(firstSection)}
          className="tc-main"
          prefetch={false}
        >
          {tcMain}
        </Link>
      ) : (
        <div className="tc-main" style={{ cursor: 'default' }}>
          {tcMain}
        </div>
      )}
      <div className="tc-tools">
        <Link
          href={`/?add-subtopic=${group.slug}`}
          className="tc-tool"
          scroll={false}
          prefetch={false}
        >
          <Icon.Plus />
          <span>Add subtopic</span>
        </Link>
        {group.custom && (
          <Link
            href={`/?delete-topic=${group.slug}&label=${encodeURIComponent(
              group.groupName,
            )}`}
            className="tc-tool"
            scroll={false}
            prefetch={false}
          >
            <Icon.Trash />
            <span>Delete topic</span>
          </Link>
        )}
      </div>
    </div>
  );
}
