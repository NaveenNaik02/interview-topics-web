'use client'

import Link from 'next/link'
import { BookOpen, Sun, Moon, Book } from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'
import { useFontSize, type FontSize } from '@/lib/FontSizeContext'
import { cn } from '@/lib/utils'

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  sepia: Book,
}

const FONT_SIZES: { key: FontSize; label: string }[] = [
  { key: 'sm', label: 'A−' },
  { key: 'md', label: 'A' },
  { key: 'lg', label: 'A+' },
]

export default function NavBar() {
  const { theme, toggle } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const ThemeIcon = THEME_ICONS[theme]

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-80 transition-opacity">
          <BookOpen className="h-5 w-5" />
          Interview Topics
        </Link>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-border overflow-hidden">
            {FONT_SIZES.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFontSize(key)}
                aria-label={`Font size ${key}`}
                className={cn(
                  'px-2.5 py-1 text-xs transition-colors',
                  fontSize === key
                    ? 'bg-muted text-foreground font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={toggle}
            aria-label={`Switch theme (current: ${theme})`}
            className="p-2 rounded-md hover:bg-muted transition-colors"
          >
            <ThemeIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
