import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/lib/context/ThemeContext';
import { themeClass, resolveServerTheme } from '@/lib/context/theme';
import { getUser } from '@/lib/supabase/user';
import { FontSizeProvider } from '@/lib/context/FontSizeContext';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';

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
  const { supabase, user } = await getUser();

  const initialTheme = await resolveServerTheme(supabase, user?.id);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-density="cozy"
      className={`${ibmSans.variable} ${ibmSerif.variable} ${ibmMono.variable} ${initialTheme ? themeClass(initialTheme) : ''}`}
    >
      <body>
        <ServiceWorkerRegistration />
        <ThemeProvider initialTheme={initialTheme}>
          <FontSizeProvider>{children}</FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
