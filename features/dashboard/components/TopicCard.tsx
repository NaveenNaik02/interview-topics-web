'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TopicGroup, sectionUrl } from '@/lib/topics';
import { Icon } from '@/components/SidebarIcons';

interface TopicCardProps {
  group: TopicGroup;
  stats: {
    completed: number;
    total: number;
    bySection: Record<string, { completed: number; total: number }>;
  };
  mounted: boolean;
  onAddSubtopic: (slug: string) => void;
  onDeleteTopic: (slug: string, label: string) => void;
}

export default function TopicCard({
  group,
  stats,
  mounted,
  onAddSubtopic,
  onDeleteTopic,
}: TopicCardProps) {
  const router = useRouter();

  let groupDone = 0;
  let groupTotal = 0;
  group.sections.forEach((s) => {
    const sUrl = sectionUrl(s);
    const sStats = stats.bySection[sUrl];
    if (sStats) {
      groupDone += sStats.completed;
      groupTotal += sStats.total;
    }
  });

  const pct = groupTotal ? Math.round((groupDone / groupTotal) * 100) : 0;
  const firstSection = group.sections[0];

  // A just-created topic (see AddTopicModal) has no subtopics yet —
  // nothing to navigate to, so render it as a static, non-clickable card.
  const tcMain = (
    <>
      <div className="tc-head">
        <span className="tc-name">{group.groupName}</span>
        <span className="tc-count">{groupTotal} Q</span>
      </div>
      <p className="tc-blurb">{group.blurb}</p>
      {firstSection ? (
        <div className="tc-progress">
          <div className="bar">
            <div
              className="bar-fill"
              style={{ width: `${mounted ? pct : 0}%` }}
            />
          </div>
          <span>
            {mounted ? groupDone : 0}/{groupTotal}
          </span>
        </div>
      ) : (
        <p className="tc-blurb" style={{ opacity: 0.7 }}>
          No subtopics yet
        </p>
      )}
    </>
  );

  return (
    <div className="topic-card">
      {firstSection ? (
        <button
          className="tc-main"
          onClick={() => router.push(sectionUrl(firstSection))}
        >
          {tcMain}
        </button>
      ) : (
        <div className="tc-main" style={{ cursor: 'default' }}>
          {tcMain}
        </div>
      )}
      <div className="tc-tools">
        <button className="tc-tool" onClick={() => onAddSubtopic(group.slug)}>
          <Icon.Plus />
          <span>Add subtopic</span>
        </button>
        {group.custom && (
          <button
            className="tc-tool"
            onClick={() => onDeleteTopic(group.slug, group.groupName)}
          >
            <Icon.Trash />
            <span>Delete topic</span>
          </button>
        )}
      </div>
    </div>
  );
}
