import type { Metadata } from 'next'
import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { ProgressProvider } from '@/lib/ProgressContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import { FontSizeProvider } from '@/lib/FontSizeContext'
import { TOPIC_GROUPS } from '@/lib/topics'
import { UIProvider } from '@/lib/UIContext'

const ibmSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-ibm-sans',
})

const ibmSerif = IBM_Plex_Serif({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-ibm-serif',
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-ibm-mono',
})

export const metadata: Metadata = {
  title: 'Prep Tracker',
  description: 'Interview Prep · Curated questions across JavaScript, React, and platform topics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${ibmSans.variable} ${ibmSerif.variable} ${ibmMono.variable}`}>
      <body>
        <ThemeProvider>
          <FontSizeProvider>
            <ProgressProvider>
              <UIProvider>
                <div className="app-container">
                  <Sidebar groups={TOPIC_GROUPS} />
                  <main className="main-content">
                    <Topbar />
                    {children}
                  </main>
                </div>
              </UIProvider>
            </ProgressProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
