import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { themeClass, DEFAULT_THEME } from '@/lib/context/theme';
import { fetchSettings } from '@/features/settings/db/dbServer';
import { getUser } from '@/lib/supabase/user';
import { FontSizeProvider } from '@/lib/context/FontSizeContext';

const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-sans',
  display: 'swap',
});

const ibmSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-ibm-serif',
  display: 'swap',
});

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Prep Tracker',
  description:
    'Interview Prep · Curated questions across JavaScript, React, and platform topics',
  manifest: '/manifest.json',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getUser();

  // undefined = no session to resolve a saved theme from; ThemeProvider then
  // falls back to localStorage / prefers-color-scheme. The row itself is a
  // cache hit for the app layout and /settings later in the same request.
  const initialTheme = user
    ? ((await fetchSettings())?.theme ?? DEFAULT_THEME)
    : undefined;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-density="cozy"
      className={`${ibmSans.variable} ${ibmSerif.variable} ${ibmMono.variable} ${initialTheme ? themeClass(initialTheme) : ''}`}
    >
      <body>
        <ThemeProvider initialTheme={initialTheme}>
          <FontSizeProvider>{children}</FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
