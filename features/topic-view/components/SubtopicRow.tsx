'use client';

import Link from 'next/link';
import { SectionMeta, sectionUrl } from '@/lib/content/topics';
import { useProgressStats } from '@/lib/hooks';
import { Icon } from '@/components/SidebarIcons';

interface Props {
  section: SectionMeta;
  onRename: (section: SectionMeta) => void;
  onDelete: (section: SectionMeta) => void;
}

export const SubtopicRow = ({ section, onRename, onDelete }: Props) => {
  const stats = useProgressStats();
  const url = sectionUrl(section);
  const { completed = 0, total = 0 } = stats.bySection[url] ?? {};
  const pct = total ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="tv-h-row">
      {/* prefetch={false} for the same reason the dashboard cards opt out —
          every route here is owner-scoped and dynamic, so a prefetch is a
          full server render. */}
      <Link href={url} className="tv-h-row-main" prefetch={false}>
        <span className="tv-h-row-name">{section.label}</span>
        {total > 0 ? (
          <>
            <div className="tv-h-bar">
              <div className="tv-h-bar-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="tv-h-frac">
              {completed}/{total}
            </span>
          </>
        ) : (
          <span className="placeholder-tag">soon</span>
        )}
      </Link>
      <div className="tv-h-row-tools">
        <button
          className="tv-h-ghost"
          title={`Rename ${section.label}`}
          aria-label={`Rename ${section.label}`}
          onClick={() => onRename(section)}
        >
          <Icon.Edit />
        </button>
        <button
          className="tv-h-ghost danger"
          title={`Delete ${section.label}`}
          aria-label={`Delete ${section.label}`}
          onClick={() => onDelete(section)}
        >
          <Icon.Trash />
        </button>
      </div>
    </div>
  );
};
