export type Theme = 'light' | 'dark' | 'sepia';

// Must match DEFAULT_SETTINGS.theme in features/settings/db.ts
export const DEFAULT_THEME: Theme = 'light';

// Not in ThemeContext.tsx ('use client') — a server component can't call a
// function exported from a client-boundary module.
export function themeClass(t: Theme): string {
  if (t === 'dark') return 'dark';
  if (t === 'sepia') return 'theme-sepia';
  return '';
}
