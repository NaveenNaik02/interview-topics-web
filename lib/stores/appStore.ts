import { create } from 'zustand'
import { createAuthSlice } from './slices/authSlice'
import { createProgressSlice } from './slices/progressSlice'
import { createPrioritySlice } from './slices/prioritySlice'
import { createSettingsSlice } from './slices/settingsSlice'
import { createInboxSlice } from '@/features/inbox/store/inboxSlice'
import { createSetAsideSlice } from './slices/setAsideSlice'
import { createStarredSlice } from './slices/starredSlice'
import { createOfflineSlice } from './slices/offlineSlice'
import { createQuestionOrderSlice } from './slices/questionOrderSlice'
import type { AppState } from './types'

export const useAppStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createProgressSlice(...a),
  ...createPrioritySlice(...a),
  ...createSettingsSlice(...a),
  ...createInboxSlice(...a),
  ...createSetAsideSlice(...a),
  ...createStarredSlice(...a),
  ...createOfflineSlice(...a),
  ...createQuestionOrderSlice(...a),
}))
