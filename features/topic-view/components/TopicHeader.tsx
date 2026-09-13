'use client';

import { TopicGroup, sectionUrl } from '@/lib/content/topics';
import { useProgressStats } from '@/lib/hooks';
import { Icon } from '@/components/SidebarIcons';
import type { Dialog } from '../types';

interface Props {
  group: TopicGroup;
  onDialog: (dialog: Dialog) => void;
}

export const TopicHeader = ({ group, onDialog }: Props) => {
  const stats = useProgressStats();

  const { completed, total } = group.sections.reduce(
    (acc, s) => {
      const sec = stats.bySection[sectionUrl(s)];
      if (!sec) return acc;

      return {
        completed: acc.completed + sec.completed,
        total: acc.total + sec.total,
      };
    },
    { completed: 0, total: 0 },
  );
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="tv-h-head">
      <div className="tv-h-ring" style={{ '--p': pct } as React.CSSProperties}>
        <span>{pct}%</span>
      </div>
      <div className="tv-h-title">
        <div className="tv-h-name">{group.groupName}</div>
        {group.blurb && <p className="tv-h-blurb">{group.blurb}</p>}
        <p className="tv-h-meta">
          {total} question{total === 1 ? '' : 's'} · {completed}/{total} done
        </p>
      </div>
      <div className="tv-h-toolbar">
        <button
          className="tv-h-ghost"
          title="Rename topic"
          aria-label="Rename topic"
          onClick={() => onDialog({ kind: 'rename-topic' })}
        >
          <Icon.Edit />
        </button>
        <button
          className="tv-h-ghost danger"
          title="Delete topic"
          aria-label="Delete topic"
          onClick={() => onDialog({ kind: 'delete-topic' })}
        >
          <Icon.Trash />
        </button>
      </div>
    </div>
  );
};
