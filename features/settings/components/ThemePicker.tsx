'use client';

import { useTheme } from '@/lib/context/ThemeContext';
import { useProgress } from '@/lib/context/ProgressContext';
import { THEME_ORDER, THEME_META } from './constants';

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { setThemeSetting } = useProgress();

  return (
    <div className="theme-pill-group">
      {THEME_ORDER.map((k) => (
        <button
          key={k}
          className={`theme-pill ${theme === k ? 'on' : ''}`}
          onClick={() => {
            setTheme(k);
            setThemeSetting(k);
          }}
          aria-pressed={theme === k}
        >
          {THEME_META[k].icon}
          {THEME_META[k].label}
        </button>
      ))}
    </div>
  );
}
