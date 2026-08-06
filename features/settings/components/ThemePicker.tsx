'use client';

import { Sun, Moon, BookOpen } from 'lucide-react';
import { useTheme, type Theme } from '@/lib/context/ThemeContext';
import { useAppStore } from '@/lib/stores/appStore';

const THEMES: { k: Theme; label: string; icon: React.ReactNode }[] = [
  { k: 'light', label: 'Light', icon: <Sun size={13} /> },
  { k: 'sepia', label: 'Sepia', icon: <BookOpen size={13} /> },
  { k: 'dark', label: 'Dark', icon: <Moon size={13} /> },
];

export default function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const setThemeSetting = useAppStore((s) => s.setThemeSetting);

  return (
    <div className="theme-pill-group">
      {THEMES.map(({ k, label, icon }) => (
        <button
          key={k}
          className={`theme-pill ${theme === k ? 'on' : ''}`}
          onClick={() => {
            setTheme(k);
            setThemeSetting(k);
          }}
          aria-pressed={theme === k}
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
