import type { StateCreator } from 'zustand'
import * as questionPositionActions from '@/lib/actions/questionPosition'
import type { AppState, QuestionOrderSlice } from '../types'

// Same reasoning as starredSlice: no offline pending-ops queue. Reordering
// is a hand-curation action gated behind being online in the UI, not
// something that needs to survive an offline session.
//
// Nothing preloads this map. Section pages seed their own positions server-side
// (fetchSectionOrder), and useSectionFilters falls back to that seed, so
// the store only has to carry positions the user has just dragged — the writes
// don't revalidate, which is the one thing the seed can be stale about.
export const createQuestionOrderSlice: StateCreator<AppState, [], [], QuestionOrderSlice> = (set, get) => ({
  orderStore: {},

  setQuestionOrder: (ids: string[]) => {
    const { user } = get()
    if (!user) return
    const next = { ...get().orderStore }
    ids.forEach((id, i) => { next[id] = i })
    set({ orderStore: next })

    questionPositionActions
      .bulkUpsertQuestionPosition(ids.map((id, i) => ({ questionId: id, position: i })))
      .catch(err => console.error('[question order] write failed:', err))
  },

  renameOrderId: (oldId: string, newId: string) => {
    const { orderStore } = get()
    if (!(oldId in orderStore)) return
    const { [oldId]: value, ...rest } = orderStore
    set({ orderStore: { ...rest, [newId]: value } })
  },
})
