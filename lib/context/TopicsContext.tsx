'use client'

import { createContext, useContext } from 'react'
import type { TopicGroup } from '../topics'

// Tunnels the merged static + DB-backed groups list (from getAllGroups(),
// computed once in layout.tsx) down to client components scattered across
// the tree — Topbar, AddQuestionFab, AddQuestionModal, PriorityMixClient,
// SearchResults, OfflineStatusPill, ProgressContext — without threading a
// `groups` prop through every intermediate layer. No local state: this just
// exposes whatever value its provider was rendered with, so it stays fresh
// across router.refresh() like any other server-to-client prop.
const TopicsContext = createContext<TopicGroup[] | null>(null)

export function TopicsProvider({
  groups,
  children,
}: {
  groups: TopicGroup[]
  children: React.ReactNode
}) {
  return (
    <TopicsContext.Provider value={groups}>{children}</TopicsContext.Provider>
  )
}

export function useTopicGroups(): TopicGroup[] {
  const groups = useContext(TopicsContext)
  if (!groups)
    throw new Error('useTopicGroups must be used within a TopicsProvider')
  return groups
}
