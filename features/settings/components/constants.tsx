import { Sun, Moon, BookOpen } from 'lucide-react';
import type { Theme } from '@/lib/context/ThemeContext';
import type { SortMode } from '@/components/FilterSortToolbar';
import type { PriorityLevel } from '@/lib/offlineSync';

export const THEME_ORDER: Theme[] = ['light', 'sepia', 'dark'];
export const THEME_META: Record<
  Theme,
  { label: string; icon: React.ReactNode }
> = {
  light: { label: 'Light', icon: <Sun size={13} /> },
  sepia: { label: 'Sepia', icon: <BookOpen size={13} /> },
  dark: { label: 'Dark', icon: <Moon size={13} /> },
};

export const SORT_OPTIONS: { k: SortMode; label: string }[] = [
  { k: 'manual', label: 'Manual (curriculum order)' },
  { k: 'high', label: 'High priority first' },
  { k: 'low', label: 'Low priority first' },
];

export const PRIORITY_OPTIONS: { k: PriorityLevel | null; label: string }[] = [
  { k: 'high', label: 'High' },
  { k: 'med', label: 'Med' },
  { k: 'low', label: 'Low' },
  { k: null, label: 'None' },
];
