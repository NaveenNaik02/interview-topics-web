'use client';

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { TopicGroup, sectionUrl } from '@/lib/topics';
import { useProgress } from '@/lib/context/ProgressContext';
import { useDrawer } from '@/lib/context/DrawerContext';
import { deleteSection, deleteTopicGroup } from '@/lib/actions/topics';
import ConfirmDialog from './ConfirmDialog';
import AddTopicModal from './AddTopicModal';
import { Icon } from './SidebarIcons';

type DeleteTarget =
  | { kind: 'group'; slug: string; label: string }
  | { kind: 'section'; topic: string; file: string; label: string };

export default function SidebarTopicTree({ groups }: { groups: TopicGroup[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const { stats } = useProgress();
  const { setDrawerOpen } = useDrawer();
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(['javascript', 'react']),
  );
  const [addTarget, setAddTarget] = useState<string | null>(null);
  const [addingTopic, setAddingTopic] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const requestDelete = (target: DeleteTarget) => {
    setDeleteError(null);
    setDeleteTarget(target);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.kind === 'group')
        await deleteTopicGroup(deleteTarget.slug);
      else await deleteSection(deleteTarget.topic, deleteTarget.file);
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

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (groups.length === 0) {
    return (
      <div className="sidebar-empty">
        <div className="sidebar-empty-note">
          No topics yet — everything you add lives here.
        </div>
        <button className="add-topic-row" onClick={() => setAddingTopic(true)}>
          <Icon.Plus /> Add topic
        </button>

        {addingTopic &&
          typeof document !== 'undefined' &&
          createPortal(
            <AddTopicModal
              initialMode="topic"
              onClose={() => setAddingTopic(false)}
              onSaved={() => {
                setAddingTopic(false);
                router.refresh();
              }}
            />,
            document.body,
          )}
      </div>
    );
  }

  return (
    <>
      {groups.map((group) => {
        const isExp = expanded.has(group.slug);

        let groupDone = 0;
        let groupTotal = 0;
        group.sections.forEach((s) => {
          const sStats = stats.bySection[sectionUrl(s)];
          if (sStats) {
            groupDone += sStats.completed;
            groupTotal += sStats.total;
          }
        });

        return (
          <div className="topic-group" key={group.slug}>
            <div className="topic-row-wrap">
              <button
                className="topic-row"
                aria-expanded={isExp}
                onClick={() => toggleExpanded(group.slug)}
              >
                <Icon.Chevron />
                <span className="topic-name">{group.groupName}</span>
                <span className="topic-progress">
                  {groupDone}/{groupTotal}
                </span>
              </button>
              <div className="topic-row-tools">
                <button
                  className="tr-tool"
                  title={`Add subtopic to ${group.groupName}`}
                  aria-label={`Add subtopic to ${group.groupName}`}
                  onClick={() => setAddTarget(group.slug)}
                >
                  <Icon.Plus />
                </button>
                {group.custom && (
                  <button
                    className="tr-tool"
                    title={`Delete ${group.groupName}`}
                    aria-label={`Delete ${group.groupName}`}
                    onClick={() =>
                      requestDelete({
                        kind: 'group',
                        slug: group.slug,
                        label: group.groupName,
                      })
                    }
                  >
                    <Icon.Trash />
                  </button>
                )}
              </div>
            </div>
            {isExp && (
              <ul className="subtopic-list">
                {group.sections.map((s) => {
                  const url = sectionUrl(s);
                  const isActive = pathname === url;
                  const sStats = stats.bySection[url];
                  const done = sStats?.completed || 0;
                  const total = sStats?.total || 0;
                  const pct = total ? (done / total) * 100 : 0;
                  const complete = total > 0 && done === total;
                  const hasQuestions = total > 0;

                  return (
                    <li key={url}>
                      <div className="subtopic-row-wrap">
                        <Link
                          href={url}
                          className={`subtopic-row ${isActive ? 'active' : ''}`}
                          onClick={() => setDrawerOpen(false)}
                          prefetch={false}
                        >
                          <span
                            className={`progress-ring ${complete ? 'complete' : ''}`}
                            style={{ '--p': pct } as React.CSSProperties}
                          />
                          <span className="subtopic-name">{s.label}</span>
                          {!hasQuestions ? (
                            <span className="placeholder-tag">soon</span>
                          ) : (
                            <span className="topic-progress">
                              {done}/{total}
                            </span>
                          )}
                        </Link>
                        {s.custom && (
                          <div className="subtopic-tools">
                            <button
                              type="button"
                              className="tr-tool"
                              title={`Delete ${s.label}`}
                              aria-label={`Delete ${s.label}`}
                              onClick={() =>
                                requestDelete({
                                  kind: 'section',
                                  topic: s.topic,
                                  file: s.file,
                                  label: s.label,
                                })
                              }
                            >
                              <Icon.Trash />
                            </button>
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}

      {/* Portaled to body: this tree sits under .sidebar, which gets a mobile-drawer
          transform that would otherwise break these overlays' position:fixed. */}
      {typeof document !== 'undefined' &&
        createPortal(
          <>
            <ConfirmDialog
              open={!!deleteTarget}
              danger
              title={deleteTarget ? `Delete "${deleteTarget.label}"?` : ''}
              message={
                deleteTarget
                  ? `This permanently removes the "${deleteTarget.label}" ${deleteTarget.kind === 'group' ? 'topic' : 'subtopic'}. ${deleteTarget.kind === 'group' ? 'Topics' : 'Subtopics'} with questions can't be deleted — remove its questions first.`
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
          </>,
          document.body,
        )}
    </>
  );
}
