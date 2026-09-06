'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/stores/appStore';
import { useTheme } from '@/lib/context/ThemeContext';

export default function ThemeSync() {
  const settingsTheme = useAppStore((s) => s.settingsTheme);
  const { setTheme } = useTheme();
  const applied = useRef(settingsTheme);

  // Only real changes to the stored theme (DB load, localStorage hydration,
  // settings reset) get pushed into ThemeContext. On mount `settingsTheme` is
  // still the slice's placeholder default, and applying it would strip the
  // class the server already rendered onto <html> — the load flash.
  useEffect(() => {
    if (applied.current === settingsTheme) return;
    applied.current = settingsTheme;
    setTheme(settingsTheme);
  }, [settingsTheme, setTheme]);

  return null;
}
