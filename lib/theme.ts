import type { createClient } from '@/lib/supabase/server';

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

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

// undefined = no session to resolve yet; ThemeProvider then falls back to localStorage.
export async function resolveServerTheme(
  supabase: SupabaseServerClient,
  userId: string | undefined,
): Promise<Theme | undefined> {
  if (!userId) return undefined;
  const { data } = await supabase
    .from('user_settings')
    .select('theme')
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.theme as Theme | undefined) ?? DEFAULT_THEME;
}
