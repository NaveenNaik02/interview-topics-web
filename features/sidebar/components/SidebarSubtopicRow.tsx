'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SectionMeta, sectionUrl } from '@/lib/topics';
import { useProgressStats } from '@/lib/useProgressStats';
import { useDrawer } from '@/lib/context/DrawerContext';
import { Icon } from '@/components/SidebarIcons';
import { DeleteTarget } from '../hooks';

interface Props {
  section: SectionMeta;
  onRequestDelete: (target: DeleteTarget) => void;
}

export const SidebarSubtopicRow = ({ section, onRequestDelete }: Props) => {
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
      <div className="subtopic-row-wrap">
        <Link
          href={url}
          className={`subtopic-row ${pathname === url ? 'active' : ''}`}
          onClick={() => setDrawerOpen(false)}
          prefetch={false}
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
        </Link>
        {section.custom && (
          <div className="subtopic-tools">
            <button
              type="button"
              className="tr-tool"
              title={`Delete ${section.label}`}
              aria-label={`Delete ${section.label}`}
              onClick={() =>
                onRequestDelete({
                  kind: 'section',
                  topic: section.topic,
                  file: section.file,
                  label: section.label,
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
};
