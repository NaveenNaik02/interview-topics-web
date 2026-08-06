'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProgressStats } from '@/lib/useProgressStats';
import { useAppStore } from '@/lib/stores/appStore';
import { TopicGroup } from '@/lib/topics';
import { deleteTopicGroup } from '@/lib/actions/topics';
import ConfirmDialog from '@/components/ConfirmDialog';
import AddTopicModal from '@/components/AddTopicModal';
import TopicCard from './components/TopicCard';
import DashboardEmptyState from './components/DashboardEmptyState';

interface Props {
  groups: TopicGroup[];
}

export default function DashboardClient({ groups }: Props) {
  const router = useRouter();
  const stats = useProgressStats();
  const mounted = useAppStore((s) => s.mounted);
  const resetAll = useAppStore((s) => s.resetAll);
  const [addTarget, setAddTarget] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    slug: string;
    label: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const doneCount = stats.completed;
  const totalCount = stats.total;
  const overallPct = totalCount
    ? Math.round((doneCount / totalCount) * 100)
    : 0;

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTopicGroup(deleteTarget.slug);
      setDeleteTarget(null);
      router.refresh();
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Could not delete — try again.',
      );
    } finally {
      setDeleting(false);
    }
  };

  if (groups.length === 0) {
    return <DashboardEmptyState />;
  }

  return (
    <>
      <div className="overall-row-card">
        <div className="orc-stat">
          <div className="label">Overall progress</div>
          <div className="overall-row">
            <span className="overall-num">{mounted ? overallPct : 0}%</span>
            <span className="overall-of">
              {mounted ? doneCount : 0} of {totalCount} questions
            </span>
          </div>
        </div>
        <div className="bar orc-bar">
          <div
            className="bar-fill"
            style={{ width: `${mounted ? overallPct : 0}%` }}
          />
        </div>
        <button
          className="reset-all"
          onClick={() => setConfirmReset(true)}
          disabled={doneCount === 0}
        >
          Reset all progress
        </button>
      </div>

      <div className="dash-grid">
        {groups.map((group) => (
          <TopicCard
            key={group.slug}
            group={group}
            stats={stats}
            mounted={mounted}
            onAddSubtopic={(slug) => setAddTarget(slug)}
            onDeleteTopic={(slug, label) => {
              setDeleteError(null);
              setDeleteTarget({ slug, label });
            }}
          />
        ))}
      </div>

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
      <ConfirmDialog
        open={!!deleteTarget}
        danger
        title={deleteTarget ? `Delete "${deleteTarget.label}"?` : ''}
        message={
          deleteTarget
            ? `This permanently removes the "${deleteTarget.label}" topic. Topics with questions can't be deleted — remove its questions first.`
            : ''
        }
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        error={deleteError}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {addTarget && (
        <AddTopicModal
          initialMode="subtopic"
          initialGroupSlug={addTarget}
          onClose={() => setAddTarget(null)}
          onSaved={() => {
            setAddTarget(null);
            router.refresh();
          }}
        />
      )}
    </>
  );
}
