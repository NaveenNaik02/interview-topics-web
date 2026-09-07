'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSearch } from '@/lib/context/SearchContext';
import { useAppStore } from '@/lib/stores/appStore';
import {
  findGroup,
  findSection,
  findGroupForSection,
} from '@/lib/content/topics';

// Routes that are their own crumb. Matched before the generic section lookup
// below, since findSection(['settings']) etc. return null (they're not real
// topic/section paths) and would otherwise leave the breadcrumb blank.
const FLAT_CRUMBS: Record<string, string> = {
  '/': 'Dashboard',
  '/settings': 'Settings',
  '/inbox': 'Inbox',
  '/priority-mix': 'Priority Mix',
  '/starred': 'Starred',
  '/grey-zone': 'Grey Zone',
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const { query } = useSearch();
  const groups = useAppStore((s) => s.groups);

  const searching = query.trim().length >= 2;
  const flat = FLAT_CRUMBS[pathname];

  if (searching) return <span className="crumb">Search results</span>;
  if (flat) return <span className="crumb">{flat}</span>;

  const dashboardCrumb = (
    <>
      <Link
        href="/"
        className="crumb crumb-parent hover:text-[var(--text)] transition-colors"
      >
        Dashboard
      </Link>
      <span className="crumb crumb-sep crumb-parent">/</span>
    </>
  );

  const segments = pathname.split('/').filter(Boolean);

  // Single segment → topic overview. Checked before findSection, which only
  // matches topic/file pairs and would return null here.
  if (segments.length === 1) {
    const group = findGroup(groups, segments[0]);
    if (!group) return null;
    return (
      <>
        {dashboardCrumb}
        <span className="crumb crumb-current" style={{ color: 'var(--text)' }}>
          {group.groupName}
        </span>
      </>
    );
  }

  const section = findSection(groups, segments);
  if (!section) return null;
  const group = findGroupForSection(groups, section);

  return (
    <>
      {dashboardCrumb}
      {group && (
        <>
          {/* Points at the topic overview, not the dashboard — before that
              page existed this crumb was the only way back, so it linked to
              "/" instead. */}
          <Link
            href={`/${group.slug}`}
            className="crumb crumb-parent hover:text-[var(--text)] transition-colors"
          >
            {group.groupName}
          </Link>
          <span className="crumb crumb-sep crumb-parent">/</span>
        </>
      )}
      <span className="crumb crumb-current" style={{ color: 'var(--text)' }}>
        {section.label}
      </span>
    </>
  );
}
