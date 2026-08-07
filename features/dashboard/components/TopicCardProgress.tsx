'use client';

import { useProgressStats } from '@/lib/useProgressStats';
import { TopicGroup, sectionUrl } from '@/lib/topics';

interface Props {
  group: TopicGroup;
}

export default function TopicCardProgress({ group }: Props) {
  const stats = useProgressStats();

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

  return (
    <div className="tc-progress">
      <div className="bar">
        <div className="bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span>
        {groupDone}/{groupTotal}
      </span>
    </div>
  );
}
