'use client';

import { CSSProperties, useState } from 'react';
import { useProgressStats } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/appStore';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function DashboardHero() {
  const stats = useProgressStats();
  const topicCount = useAppStore((s) => s.groups.length);
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  const doneCount = stats.completed;
  const totalCount = stats.total;
  const overallPct = totalCount
    ? Math.round((doneCount / totalCount) * 100)
    : 0;

  return (
    <header className="dash-hero-ring">
      <div className="dash-ring" style={{ '--p': overallPct } as CSSProperties}>
        <span>{overallPct}%</span>
      </div>
      <div className="dash-hero-text">
        <h1 className="dash-title">Interview prep, organized.</h1>
        <p className="dash-sub">
          {doneCount} of {totalCount} questions answered across {topicCount}{' '}
          topic{topicCount === 1 ? '' : 's'}.
        </p>
      </div>
      <button
        className="reset-all"
        onClick={() => setConfirmReset(true)}
        disabled={doneCount === 0}
      >
        Reset all progress
      </button>

      <ConfirmDialog
        open={confirmReset}
        danger
        requireText="RESET"
        title="Reset everything?"
        message={`This permanently clears progress on all ${doneCount} completed questions across every topic. This action cannot be undone.`}
        confirmLabel="Reset everything"
        onConfirm={() => {
          resetAll();
          setConfirmReset(false);
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </header>
  );
}
