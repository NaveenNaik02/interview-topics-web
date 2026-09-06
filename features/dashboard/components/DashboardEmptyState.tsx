import Link from 'next/link';
import AddTopicModalClient from './AddTopicModalClient';

interface Props {
  searchParams?: {
    'add-topic'?: string;
  };
}

export default function DashboardEmptyState({ searchParams }: Props) {
  const showNewTopic = searchParams?.['add-topic'] === 'true';

  return (
    <div className="dashboard-view">
      <div className="empty-hero">
        <div className="empty-icon">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <div className="dash-eyebrow">Your prep, from scratch</div>
        <h1 className="empty-title">Nothing here yet — build your own set.</h1>
        <p className="empty-sub">
          Create a topic, add the questions you actually want to practice, and
          track progress your way. No preset curriculum — just what you put in.
        </p>
        <Link
          className="btn btn-primary"
          style={{ marginTop: 'var(--s-2)', textDecoration: 'none' }}
          href="/?add-topic=true"
          scroll={false}
        >
          + Create your first topic
        </Link>
      </div>

      <div className="dash-grid">
        <Link
          className="topic-card empty-new-topic"
          href="/?add-topic=true"
          scroll={false}
          style={{ textDecoration: 'none', textAlign: 'left' }}
        >
          <div className="tc-main">
            <span className="tc-name" style={{ color: 'var(--text-subtle)' }}>
              + New topic
            </span>
            <p className="tc-blurb" style={{ marginTop: 4 }}>
              e.g. &ldquo;System Design&rdquo;, &ldquo;SQL&rdquo;,
              &ldquo;Behavioral&rdquo;
            </p>
          </div>
        </Link>
      </div>

      {showNewTopic && <AddTopicModalClient />}
    </div>
  );
}
