import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getUser } from '@/lib/supabase/user';
import { getAllGroups } from '@/lib/topicsData';
import { findGroupForSection } from '@/lib/topics';
import { GreyZoneClient, fetchGreyZoneQuestions } from '@/features/grey-zone';
import type { ShortlistQuestion } from '@/lib/db/shortlist';

interface Props {
  // Which topic is drilled into — in the URL rather than component state, so
  // this whole page stays a server component (and back/forward works).
  searchParams: Promise<{ topic?: string }>;
}

// Questions pushed here from any subtopic while the user is still shaky on
// them — grouped by main topic, topics shown first so you drill into just the
// one you want instead of scrolling a flat list.
export default async function GreyZonePage({ searchParams }: Props) {
  const [{ supabase, user }, { topic: openSlug }] = await Promise.all([
    getUser(),
    searchParams,
  ]);
  const questions = user ? await fetchGreyZoneQuestions(supabase) : [];
  const groups = await getAllGroups();

  const byTopic = new Map<
    string,
    { slug: string; name: string; questions: ShortlistQuestion[] }
  >();
  for (const q of questions) {
    const entry = byTopic.get(q.groupSlug) ?? {
      slug: q.groupSlug,
      name: findGroupForSection(groups, q)?.groupName ?? q.groupSlug,
      questions: [],
    };
    entry.questions.push(q);
    byTopic.set(q.groupSlug, entry);
  }
  const topics = Array.from(byTopic.values());
  const openTopic = openSlug ? byTopic.get(openSlug) : undefined;

  if (openTopic) {
    return (
      <div className="content-wrapper">
        <Link href="/grey-zone" className="back-link">
          <ChevronLeft /> Grey Zone
        </Link>
        <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
          <h1 className="subtopic-title">{openTopic.name}</h1>
        </div>
        <GreyZoneClient questions={openTopic.questions} />
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Shortlist</div>
        <h1 className="subtopic-title">Grey Zone</h1>
        <p className="build-lede">
          Questions you&apos;re not confident on yet, pulled from wherever you
          found them.
        </p>
      </div>
      {topics.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">Nothing in the Grey Zone yet</div>
          <div className="es-sub">
            Open the kebab menu on any question and choose &quot;Add to Grey
            Zone&quot; to keep it here for a quick revisit.
          </div>
        </div>
      ) : (
        <div className="review-topics">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`/grey-zone?topic=${t.slug}`}
              className="review-topic-card"
            >
              <span className="rt-icon">{t.name.charAt(0).toUpperCase()}</span>
              <span className="rt-body">
                <span className="rt-name">{t.name}</span>
                <span className="rt-sub">
                  {t.questions.length}{' '}
                  {t.questions.length === 1 ? 'question' : 'questions'}
                </span>
              </span>
              <span className="rt-count">{t.questions.length}</span>
              <span className="rt-chev">
                <ChevronRight />
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
