import { create } from 'zustand';
import { createAuthSlice } from './slices/authSlice';
import { createProgressSlice } from './slices/progressSlice';
import { createPrioritySlice } from './slices/prioritySlice';
import { createSettingsSlice } from './slices/settingsSlice';
import { createOfflineSlice } from './slices/offlineSlice';
import type { AppState } from './types';

export const useAppStore = create<AppState>()((...a) => ({
  ...createAuthSlice(...a),
  ...createProgressSlice(...a),
  ...createPrioritySlice(...a),
  ...createSettingsSlice(...a),
  ...createOfflineSlice(...a),
}));
