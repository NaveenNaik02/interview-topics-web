'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSearch } from '@/lib/context/SearchContext'
import SearchResults from './SearchResults'

export default function MainContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { query } = useSearch()
  const pathname = usePathname()

  // Every route (topics, subtopics, settings, priority-mix) is served by the
  // same catch-all page.tsx, so no layout/page boundary ever changes between
  // navigations — Next's App Router scroll-to-top never fires on its own.
  // Reset explicitly here instead.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return query.trim().length >= 2 ? <SearchResults /> : <>{children}</>
}
