'use client';

import { useState } from 'react';
import { useProgressStats } from '@/lib/hooks';
import { useAppStore } from '@/lib/stores/appStore';
import ConfirmDialog from '@/components/ConfirmDialog';

export default function OverallProgressCard() {
  const stats = useProgressStats();
  const resetAll = useAppStore((s) => s.resetAll);
  const [confirmReset, setConfirmReset] = useState(false);

  const doneCount = stats.completed;
  const totalCount = stats.total;
  const overallPct = totalCount
    ? Math.round((doneCount / totalCount) * 100)
    : 0;

  return (
    <div className="overall-row-card">
      <div className="orc-stat">
        <div className="label">Overall progress</div>
        <div className="overall-row">
          <span className="overall-num">{overallPct}%</span>
          <span className="overall-of">
            {doneCount} of {totalCount} questions
          </span>
        </div>
      </div>
      <div className="bar orc-bar">
        <div className="bar-fill" style={{ width: `${overallPct}%` }} />
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
    </div>
  );
}
