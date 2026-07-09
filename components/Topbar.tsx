'use client'

import React, { useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Book, Menu, Github, LogOut, Search, X } from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'
import { useUI } from '@/lib/UIContext'
import { useProgress } from '@/lib/ProgressContext'
import { findSection, findGroupForSection } from '@/lib/topics'
import { Button } from './ui/button'
import OfflineStatusPill from './OfflineStatusPill'

const THEME_ICONS = {
  light: Book,
  sepia: Moon,
  dark: Sun,
}

export default function Topbar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { setDrawerOpen, query, setQuery } = useUI()
  const { user, signInWithGitHub, signOut, mounted } = useProgress()
  const inputRef = useRef<HTMLInputElement>(null)

  const ThemeIcon = THEME_ICONS[theme]
  const isHome = pathname === '/'
  const isAnonymous = user?.is_anonymous
  const searching = query.trim().length >= 2

  // Breadcrumbs logic
  let breadcrumbs: React.ReactNode = null
  if (searching) {
    breadcrumbs = <span className="crumb">Search results</span>
  } else if (!isHome) {
    const segments = pathname.split('/').filter(Boolean)
    const section = findSection(segments)
    if (section) {
      const group = findGroupForSection(section)
      breadcrumbs = (
        <>
          <Link href="/" className="crumb crumb-parent hover:text-[var(--text)] transition-colors">
            {group?.groupName || 'Dashboard'}
          </Link>
          <span className="crumb crumb-sep crumb-parent">/</span>
          <span className="crumb crumb-current" style={{ color: 'var(--text)' }}>{section.label}</span>
        </>
      )
    }
  } else {
    breadcrumbs = <span className="crumb">Dashboard</span>
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="icon-btn menu-btn"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <Menu size={16} />
        </button>
        {breadcrumbs}
      </div>
      <div className="topbar-right flex items-center gap-2">
        <OfflineStatusPill />
        <div className="search-box">
          <span className="search-icon"><Search size={15} /></span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery('') }}
            aria-label="Search questions"
          />
          {query && (
            <button className="search-clear" onClick={() => { setQuery(''); inputRef.current?.focus() }} aria-label="Clear search">
              <X size={12} />
            </button>
          )}
        </div>

        <button
          className="icon-btn"
          onClick={toggle}
          aria-label={`Switch theme (current: ${theme})`}
        >
          <ThemeIcon size={16} />
        </button>

        <div className="h-4 w-[1px] bg-[var(--border)] mx-1" />

        {mounted && (
          isAnonymous ? (
            <Button
              variant="outline"
              size="sm"
              onClick={signInWithGitHub}
              className="gap-2 h-8 text-xs font-semibold bg-transparent border-[var(--border)] hover:bg-[var(--bg-hover)] text-[var(--text-muted)] hover:text-[var(--text)]"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Login</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="gap-2 h-8 text-xs font-semibold text-[var(--text-subtle)] hover:text-[var(--text)] hover:bg-[var(--bg-hover)]"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Logout</span>
            </Button>
          )
        )}
      </div>
    </header>
  )
}
