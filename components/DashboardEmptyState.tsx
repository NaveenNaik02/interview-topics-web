'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddTopicModal from './AddTopicModal';

export default function DashboardEmptyState() {
  const router = useRouter();
  const [showNewTopic, setShowNewTopic] = useState(false);

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
        <button
          className="btn btn-primary"
          style={{ marginTop: 'var(--s-2)' }}
          onClick={() => setShowNewTopic(true)}
        >
          + Create your first topic
        </button>
      </div>

      <div className="dash-grid">
        <button
          className="topic-card empty-new-topic"
          onClick={() => setShowNewTopic(true)}
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
        </button>
      </div>

      {showNewTopic && (
        <AddTopicModal
          onClose={() => setShowNewTopic(false)}
          onSaved={() => {
            setShowNewTopic(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
