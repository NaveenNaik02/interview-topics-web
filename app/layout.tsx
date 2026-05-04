import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import NavBar from '@/components/NavBar'
import { ProgressProvider } from '@/lib/ProgressContext'
import { ThemeProvider } from '@/lib/ThemeContext'
import { FontSizeProvider } from '@/lib/FontSizeContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Interview Topics',
  description: 'Interview Q&A study tracker',
}

const themeScript = `(function(){try{var t=localStorage.getItem('theme'),cl=document.documentElement.classList;if(t==='dark')cl.add('dark');else if(t==='sepia')cl.add('sepia');else if(!t&&window.matchMedia('(prefers-color-scheme:dark)').matches)cl.add('dark')}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <FontSizeProvider>
            <ProgressProvider>
              <NavBar />
              <main className="max-w-4xl mx-auto px-4 py-8">
                {children}
              </main>
            </ProgressProvider>
          </FontSizeProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
