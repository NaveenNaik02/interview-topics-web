import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { getUser } from '@/lib/supabase/user';
import { getAllGroups } from '@/lib/content/topicsData';
import { findGroupForSection } from '@/lib/content/topics';
import { QuestionShortlist } from '@/components/QuestionShortlist';
import { fetchShortlistQuestions } from '@/lib/db/shortlistServer';
import type { ShortlistFlag, ShortlistQuestion } from '@/lib/db/shortlist';

// Stands in for the topics list below while the questions load. loading.tsx
// gets no searchParams, so a drilled-in topic gets these cards too — same
// header, and close enough in shape to the question rows it precedes.
export const ShortlistSkeleton = () => (
  <div className="content-wrapper animate-pulse">
    <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
      <div className="eyebrow h-4 w-20 rounded bg-[var(--bg-soft)]" />
      <div className="my-2 h-10 w-56 rounded bg-[var(--bg-soft)]" />
      <div className="h-4 w-96 max-w-full rounded bg-[var(--bg-soft)]" />
    </div>
    <div className="review-topics">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="review-topic-card">
          <span className="rt-icon bg-[var(--bg-soft)]" />
          <span className="rt-body">
            <span className="h-4 w-32 rounded bg-[var(--bg-soft)]" />
            <span className="h-3 w-20 rounded bg-[var(--bg-soft)]" />
          </span>
        </div>
      ))}
    </div>
  </div>
);

interface Props {
  flag: ShortlistFlag;
  basePath: string;
  title: string;
  lede: string;
  emptyTitle: string;
  emptySub: string;
  // Which topic is drilled into — in the URL rather than component state, so
  // this whole page stays a server component (and back/forward works).
  openSlug?: string;
}

// Both shortlists (starred, grey zone) are the same page: topics first, so you
// drill into just the one you want instead of scrolling a flat list.
export const ShortlistPage = async ({
  flag,
  basePath,
  title,
  lede,
  emptyTitle,
  emptySub,
  openSlug,
}: Props) => {
  const { user } = await getUser();
  const questions = user ? await fetchShortlistQuestions(flag) : [];
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
        <Link href={basePath} className="back-link">
          <ChevronLeft /> {title}
        </Link>
        <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
          <h1 className="subtopic-title">{openTopic.name}</h1>
        </div>
        <QuestionShortlist questions={openTopic.questions} flag={flag} />
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Shortlist</div>
        <h1 className="subtopic-title">{title}</h1>
        <p className="build-lede">{lede}</p>
      </div>
      {topics.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">{emptyTitle}</div>
          <div className="es-sub">{emptySub}</div>
        </div>
      ) : (
        <div className="review-topics">
          {topics.map((t) => (
            <Link
              key={t.slug}
              href={`${basePath}?topic=${t.slug}`}
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
};
