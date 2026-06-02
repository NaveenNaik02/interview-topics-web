'use client'

import { useUI } from '@/lib/UIContext'
import SearchResults from './SearchResults'

export default function MainContent({ children }: { children: React.ReactNode }) {
  const { query } = useUI()
  return query.trim().length >= 2 ? <SearchResults /> : <>{children}</>
}
