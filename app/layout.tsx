import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MainContent from '@/components/MainContent'
import StoreBootstrap from '@/components/StoreBootstrap'
import { ThemeProvider } from '@/lib/context/ThemeContext'
import { themeClass, resolveServerTheme } from '@/lib/theme'
import { createClient } from '@/lib/supabase/server'
import { FontSizeProvider } from '@/lib/context/FontSizeContext'
import { TopicsProvider } from '@/lib/context/TopicsContext'
import { TotalsProvider } from '@/lib/context/TotalsContext'
import { getAllGroups } from '@/lib/topicsData'
import { DrawerProvider } from '@/lib/context/DrawerContext'
import { SearchProvider } from '@/lib/context/SearchContext'
import { fetchAllCounts } from '@/lib/parser'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import OfflineToast from '@/components/OfflineToast'
import ThemeSync from '@/components/ThemeSync'
import AddQuestionFab from '@/components/AddQuestionFab'
import { InboxFab } from '@/features/inbox/components'

const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-sans',
  display: 'swap',
})

const ibmSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-ibm-serif',
  display: 'swap',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Prep Tracker',
  description:
    'Interview Prep · Curated questions across JavaScript, React, and platform topics',
  manifest: '/manifest.json',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const [
    initialTotals,
    groups,
    {
      data: { user },
    },
  ] = await Promise.all([
    fetchAllCounts(),
    getAllGroups(),
    supabase.auth.getUser(),
  ])

  const initialTheme = await resolveServerTheme(supabase, user?.id)

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
          <FontSizeProvider>
            <TopicsProvider groups={groups}>
              <TotalsProvider initialTotals={initialTotals}>
                <StoreBootstrap initialTotals={initialTotals} />
                <ThemeSync />
                <OfflineToast />
                <AddQuestionFab />
                <InboxFab />
                <DrawerProvider>
                  <SearchProvider>
                    <div className="app-container">
                      <Sidebar groups={groups} />
                      <main className="main-content">
                        <Topbar />
                        <MainContent>{children}</MainContent>
                      </main>
                    </div>
                  </SearchProvider>
                </DrawerProvider>
              </TotalsProvider>
            </TopicsProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
