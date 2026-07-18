import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import MainContent from '@/components/MainContent'
import StoreBootstrap from '@/components/StoreBootstrap'
import { ThemeProvider } from '@/lib/ThemeContext'
import { FontSizeProvider } from '@/lib/FontSizeContext'
import { TopicsProvider } from '@/lib/TopicsContext'
import { TotalsProvider } from '@/lib/TotalsContext'
import { getAllGroups } from '@/lib/topicsData'
import { UIProvider } from '@/lib/UIContext'
import { fetchAllCounts } from '@/lib/parser'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import OfflineToast from '@/components/OfflineToast'
import ThemeSync from '@/components/ThemeSync'
import AddQuestionFab from '@/components/AddQuestionFab'
import InboxFab from '@/components/InboxFab'

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
  description: 'Interview Prep · Curated questions across JavaScript, React, and platform topics',
  manifest: '/manifest.json',
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [initialTotals, groups] = await Promise.all([fetchAllCounts(), getAllGroups()])

  return (
    <html lang="en" suppressHydrationWarning data-density="cozy" className={`${ibmSans.variable} ${ibmSerif.variable} ${ibmMono.variable}`}>
      <body>
        <ServiceWorkerRegistration />
        <ThemeProvider>
          <FontSizeProvider>
            <TopicsProvider groups={groups}>
              <TotalsProvider initialTotals={initialTotals}>
                <StoreBootstrap initialTotals={initialTotals} />
                <ThemeSync />
                <OfflineToast />
                <AddQuestionFab />
                <InboxFab />
                <UIProvider>
                  <div className="app-container">
                    <Sidebar groups={groups} />
                    <main className="main-content">
                      <Topbar />
                      <MainContent>{children}</MainContent>
                    </main>
                  </div>
                </UIProvider>
              </TotalsProvider>
            </TopicsProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
