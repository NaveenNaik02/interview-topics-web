'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Coffee, Menu, Github, LogOut } from 'lucide-react'
import { useTheme } from '@/lib/ThemeContext'
import { useUI } from '@/lib/UIContext'
import { useProgress } from '@/lib/ProgressContext'
import { findSection, findGroupForSection } from '@/lib/topics'
import { Button } from './ui/button'

const THEME_ICONS = {
  light: Sun,
  dark: Moon,
  sepia: Coffee,
}

export default function Topbar() {
  const pathname = usePathname()
  const { theme, toggle } = useTheme()
  const { setDrawerOpen } = useUI()
  const { user, signInWithGitHub, signOut, mounted } = useProgress()

  const ThemeIcon = THEME_ICONS[theme]
  const isHome = pathname === '/'
  const isAnonymous = user?.is_anonymous
  
  // Breadcrumbs logic
  let breadcrumbs: React.ReactNode = null
  if (!isHome) {
    const segments = pathname.split('/').filter(Boolean)
    const section = findSection(segments)
    if (section) {
      const group = findGroupForSection(section)
      breadcrumbs = (
        <>
          <Link href="/" className="crumb hover:text-[var(--text)] transition-colors">
            {group?.groupName || 'Dashboard'}
          </Link>
          <span className="crumb crumb-sep">/</span>
          <span className="crumb" style={{ color: 'var(--text)' }}>{section.label}</span>
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
