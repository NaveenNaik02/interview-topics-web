'use client'

import React, { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sun, Moon, Book, Menu, Github, LogOut, Search, X, Settings, User, ChevronDown } from 'lucide-react'
import { useTheme, type Theme } from '@/lib/ThemeContext'
import { useUI } from '@/lib/UIContext'
import { useProgress } from '@/lib/ProgressContext'
import { findSection, findGroupForSection } from '@/lib/topics'
import OfflineStatusPill from './OfflineStatusPill'

const THEME_ICONS = {
  light: Book,
  sepia: Moon,
  dark: Sun,
}
const THEME_ORDER: Theme[] = ['light', 'sepia', 'dark']

export default function Topbar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const {
    setThemeSetting, user, signInWithGitHub, signOut, mounted,
    isOnline, offlineModeEnabled, isSyncing, isCaching, pendingOpsCount,
  } = useProgress()
  const { setDrawerOpen, query, setQuery } = useUI()
  const inputRef = useRef<HTMLInputElement>(null)

  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!moreOpen) return
    const onDoc = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false)
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMoreOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [moreOpen])

  const isHome = pathname === '/'
  const isSettings = pathname === '/settings'
  const isPriorityMix = pathname === '/priority-mix'
  const searching = query.trim().length >= 2

  const loggedIn = mounted && !!user && !user.is_anonymous
  const avatarUrl = loggedIn ? (user?.user_metadata?.avatar_url as string | undefined) : undefined
  const displayName = loggedIn
    ? (user?.user_metadata?.full_name || user?.user_metadata?.user_name || user?.user_metadata?.name) as string | undefined
    : undefined
  const initials = displayName
    ? displayName.trim().split(/\s+/).map(s => s[0]).join('').slice(0, 2).toUpperCase()
    : ''

  // Small status dot on the account avatar reflects offline/sync state at a glance
  const acctDotVariant = !isOnline
    ? 'offline'
    : (isSyncing || isCaching)
      ? 'busy'
      : (offlineModeEnabled && pendingOpsCount > 0)
        ? 'busy'
        : offlineModeEnabled
          ? 'ready'
          : ''

  // Breadcrumbs logic — isSettings/isPriorityMix must be checked before the
  // generic section lookup below, since findSection(['settings']) etc.
  // return null (they're not real topic/section paths) and would otherwise
  // leave breadcrumbs blank instead of falling through to the Dashboard label.
  let breadcrumbs: React.ReactNode = null
  if (searching) {
    breadcrumbs = <span className="crumb">Search results</span>
  } else if (isSettings) {
    breadcrumbs = <span className="crumb">Settings</span>
  } else if (isPriorityMix) {
    breadcrumbs = <span className="crumb">Priority Mix</span>
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

  const handleThemeChange = (t: Theme) => {
    setTheme(t)
    setThemeSetting(t)
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

        <div className="more-menu-wrap" ref={moreRef}>
          <button
            className="acct-trigger"
            onClick={() => setMoreOpen(v => !v)}
            aria-label="Account and settings"
            title="Account and settings"
            aria-haspopup="true"
            aria-expanded={moreOpen}
          >
            <span className={`acct-avatar ${loggedIn ? 'is-logged-in' : ''}`}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
              ) : loggedIn ? (
                <span className="login-initials">{initials || <User size={15} />}</span>
              ) : (
                <User size={15} />
              )}
              {acctDotVariant && <span className={`acct-dot is-${acctDotVariant}`} />}
            </span>
            <ChevronDown className="acct-chevron" />
          </button>

          {moreOpen && (
            <div className="more-menu acct-menu" role="menu">
              <OfflineStatusPill />
              <div className="acct-menu-sep" />
              <div className="acct-theme-row">
                <span className="lbl">Theme</span>
                <div className="acct-theme-opts">
                  {THEME_ORDER.map((k) => {
                    const Icon = THEME_ICONS[k]
                    return (
                      <button
                        key={k}
                        className={`acct-theme-opt ${theme === k ? 'on' : ''}`}
                        onClick={() => handleThemeChange(k)}
                        aria-pressed={theme === k}
                        title={k}
                      >
                        <Icon size={13} />
                      </button>
                    )
                  })}
                </div>
              </div>
              <div className="acct-menu-sep" />
              <Link
                href="/settings"
                className={`more-menu-item ${isSettings ? 'is-active' : ''}`}
                role="menuitem"
                aria-current={isSettings}
                onClick={() => setMoreOpen(false)}
              >
                <Settings /> Settings
              </Link>
              <button
                className="more-menu-item"
                role="menuitem"
                onClick={() => { (loggedIn ? signOut : signInWithGitHub)(); setMoreOpen(false) }}
              >
                {loggedIn ? <LogOut /> : <Github />}
                {loggedIn ? `Log out (${displayName || 'Account'})` : 'Log in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
