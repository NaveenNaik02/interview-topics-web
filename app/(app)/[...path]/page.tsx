import { notFound } from 'next/navigation';
import Link from 'next/link';
import {
  findGroup,
  findSection,
  findGroupForSection,
  findPrevNextSections,
  sectionPath,
  sectionUrl,
} from '@/lib/content/topics';
import { getAllGroups } from '@/lib/content/topicsData';
import { parseSection } from '@/lib/content/parser';
import { fetchSectionOrder } from '@/lib/db/questionPositionServer';
import { SectionClient } from '@/features/section-view';
import { TopicOverview } from '@/features/topic-view';
import { fetchTopicFlagIds } from '@/lib/db/shortlistServer';

interface Props {
  params: Promise<{ path: string[] }>;
}

export default async function Page({ params }: Props) {
  const { path: segments } = await params;

  if (segments.length === 1) {
    const [groups, flagIds] = await Promise.all([
      getAllGroups(),
      fetchTopicFlagIds(segments[0]),
    ]);

    const group = findGroup(groups, segments[0]);
    if (!group) notFound();

    return <TopicOverview slug={group.slug} flagIds={flagIds} />;
  }

  const [groups, questions, initialOrder] = await Promise.all([
    getAllGroups(),
    parseSection(sectionPath(segments)),
    fetchSectionOrder(sectionPath(segments)),
  ]);

  const section = findSection(groups, segments);
  if (!section) notFound();

  const group = findGroupForSection(groups, section);
  if (!group) notFound();

  const { prev, next } = findPrevNextSections(groups, section);

  return (
    <div className="space-y-12">
      <SectionClient
        section={section}
        questions={questions}
        initialOrder={initialOrder}
      />

      <div className="content-wrapper !pt-0">
        <div className="flex items-center justify-between pt-8 border-t border-[var(--border)]">
          {prev ? (
            <Link
              href={sectionUrl(prev)}
              className="flex flex-col gap-1 text-left group"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">
                Previous
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                {prev.label}
              </span>
            </Link>
          ) : (
            <div />
          )}
          {next ? (
            <Link
              href={sectionUrl(next)}
              className="flex flex-col gap-1 text-right group"
            >
              <span className="text-[10px] uppercase tracking-wider text-[var(--text-subtle)] font-semibold">
                Next
              </span>
              <span className="text-sm font-medium text-[var(--text-muted)] group-hover:text-[var(--text)] transition-colors">
                {next.label}
              </span>
            </Link>
          ) : (
            <div />
          )}
        </div>
      </div>
    </div>
  );
}

// Deliberately no generateStaticParams(): everything is per-account now, and
// getAllGroups() reads cookies() (via createClient()). Exporting it — even
// returning [] — opts this route into static generation, and unlisted paths
// are then generated on demand *statically*, so cookies() throws
// DYNAMIC_SERVER_USAGE and every section page 500s. Without it the route is
// server-rendered per request, which is what we want.
