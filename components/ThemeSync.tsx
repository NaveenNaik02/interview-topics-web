'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useTheme } from '@/lib/context/ThemeContext';

export default function ThemeSync() {
  const settingsTheme = useAppStore((s) => s.settingsTheme);
  const { setTheme } = useTheme();

  // When DB settings load, apply the stored theme (overrides localStorage default)
  useEffect(() => {
    if (settingsTheme) setTheme(settingsTheme);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsTheme]);

  return null;
}
