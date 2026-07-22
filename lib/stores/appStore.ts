import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createProgressSlice } from './slices/progressSlice';
import { createPrioritySlice } from './slices/prioritySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createInboxSlice } from './slices/inboxSlice';
import { createSetAsideSlice } from './slices/setAsideSlice';
import { createOfflineSlice } from './slices/offlineSlice';
import type { AppState } from './types';

export const useAppStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createProgressSlice(...a),
  ...createPrioritySlice(...a),
  ...createSettingsSlice(...a),
  ...createInboxSlice(...a),
  ...createSetAsideSlice(...a),
  ...createOfflineSlice(...a),
}));
