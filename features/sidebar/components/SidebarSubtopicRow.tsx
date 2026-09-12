'use client';

import { usePathname } from 'next/navigation';
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink';
import { SectionMeta, sectionUrl } from '@/lib/content/topics';
import { useProgressStats } from '@/lib/hooks';
import { useDrawer } from '@/lib/context/DrawerContext';

interface Props {
  section: SectionMeta;
}

export const SidebarSubtopicRow = ({ section }: Props) => {
  const pathname = usePathname();
  const stats = useProgressStats();
  const { setDrawerOpen } = useDrawer();

  const url = sectionUrl(section);
  const sStats = stats.bySection[url];
  const done = sStats?.completed || 0;
  const total = sStats?.total || 0;
  const pct = total ? (done / total) * 100 : 0;

  return (
    <li>
      <HoverPrefetchLink
        href={url}
        className={`subtopic-row ${pathname === url ? 'active' : ''}`}
        onClick={() => setDrawerOpen(false)}
      >
        <span
          className={`progress-ring ${total > 0 && done === total ? 'complete' : ''}`}
          style={{ '--p': pct } as React.CSSProperties}
        />
        <span className="subtopic-name">{section.label}</span>
        {total > 0 ? (
          <span className="topic-progress">
            {done}/{total}
          </span>
        ) : (
          <span className="placeholder-tag">soon</span>
        )}
      </HoverPrefetchLink>
    </li>
  );
};
