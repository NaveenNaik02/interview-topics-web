'use client'

import { createContext, useContext } from 'react'

// Mirrors TopicsContext: tunnels the server-computed per-URL question counts
// (fetchAllCounts(), computed once in layout.tsx) down synchronously so
// useProgress() can seed `stats` with real numbers on the very first render
// instead of waiting on a post-mount effect to populate the Zustand store
// (which would otherwise flash "0 questions" before hydration settles).
const TotalsContext = createContext<Record<string, number> | null>(null)

export function TotalsProvider({ initialTotals, children }: { initialTotals: Record<string, number>; children: React.ReactNode }) {
  return <TotalsContext.Provider value={initialTotals}>{children}</TotalsContext.Provider>
}

export function useInitialTotals(): Record<string, number> {
  const totals = useContext(TotalsContext)
  if (!totals) throw new Error('useInitialTotals must be used within a TotalsProvider')
  return totals
}
