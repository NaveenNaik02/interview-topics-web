'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSearch } from '@/lib/context/SearchContext'
import { useTopicGroups } from '@/lib/context/TopicsContext'
import { findSection, findGroupForSection } from '@/lib/topics'

// isSettings/isPriorityMix must be checked before the generic section lookup
// below, since findSection(['settings']) etc. return null (they're not real
// topic/section paths) and would otherwise leave breadcrumbs blank instead of
// falling through to the Dashboard label.
export default function Breadcrumbs() {
  const pathname = usePathname()
  const { query } = useSearch()
  const groups = useTopicGroups()

  const searching = query.trim().length >= 2
  const isHome = pathname === '/'
  const isSettings = pathname === '/settings'
  const isPriorityMix = pathname === '/priority-mix'

  if (searching) return <span className="crumb">Search results</span>
  if (isSettings) return <span className="crumb">Settings</span>
  if (isPriorityMix) return <span className="crumb">Priority Mix</span>
  if (isHome) return <span className="crumb">Dashboard</span>

  const segments = pathname.split('/').filter(Boolean)
  const section = findSection(groups, segments)
  if (!section) return null
  const group = findGroupForSection(groups, section)

  return (
    <>
      <Link
        href="/"
        className="crumb crumb-parent hover:text-[var(--text)] transition-colors"
      >
        {group?.groupName || 'Dashboard'}
      </Link>
      <span className="crumb crumb-sep crumb-parent">/</span>
      <span className="crumb crumb-current" style={{ color: 'var(--text)' }}>
        {section.label}
      </span>
    </>
  )
}
