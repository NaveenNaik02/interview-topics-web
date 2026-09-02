'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname, useRouter } from 'next/navigation';
import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { useProgressStats } from '@/lib/hooks';
import { Icon } from '@/components/SidebarIcons';
import AddTopicModal from '@/components/AddTopicModal';
import { DeleteTarget } from '../hooks';
import { SidebarSubtopicRow } from './SidebarSubtopicRow';

interface Props {
  group: TopicGroup;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const SidebarTopicGroup = ({ group, onRequestDelete }: Props) => {
  const router = useRouter();
  const pathname = usePathname();
  const stats = useProgressStats();
  const active =
    pathname === `/${group.slug}` ||
    group.sections.some((s) => pathname === sectionUrl(s));
  const [expanded, setExpanded] = useState(active);
  const [wasActive, setWasActive] = useState(active);
  const [adding, setAdding] = useState(false);

  if (active !== wasActive) {
    setWasActive(active);
    if (active) setExpanded(true);
  }

  const { done, total } = group.sections.reduce(
    (acc, s) => {
      const sStats = stats.bySection[sectionUrl(s)];
      return sStats
        ? { done: acc.done + sStats.completed, total: acc.total + sStats.total }
        : acc;
    },
    { done: 0, total: 0 },
  );

  return (
    <div className="topic-group">
      <div className="topic-row-wrap">
        <button
          className="topic-row"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
        >
          <Icon.Chevron />
          <span className="topic-name">{group.groupName}</span>
          <span className="topic-progress">
            {done}/{total}
          </span>
        </button>
        <div className="topic-row-tools">
          <button
            className="tr-tool"
            title={`Add subtopic to ${group.groupName}`}
            aria-label={`Add subtopic to ${group.groupName}`}
            onClick={() => setAdding(true)}
          >
            <Icon.Plus />
          </button>
          {group.custom && (
            <button
              className="tr-tool"
              title={`Delete ${group.groupName}`}
              aria-label={`Delete ${group.groupName}`}
              onClick={() =>
                onRequestDelete({
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

      {expanded && (
        <ul className="subtopic-list">
          {group.sections.map((s) => (
            <SidebarSubtopicRow
              key={sectionUrl(s)}
              section={s}
              onRequestDelete={onRequestDelete}
            />
          ))}
        </ul>
      )}

      {/* Portaled to body: the sidebar's mobile-drawer transform would otherwise
          break this overlay's position:fixed. */}
      {adding &&
        typeof document !== 'undefined' &&
        createPortal(
          <AddTopicModal
            initialMode="subtopic"
            initialGroupSlug={group.slug}
            onClose={() => setAdding(false)}
            onSaved={() => {
              setAdding(false);
              router.refresh();
            }}
          />,
          document.body,
        )}
    </div>
  );
};
