'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Sun,
  Moon,
  Book,
  Github,
  LogOut,
  Settings,
  User,
  ChevronDown,
} from 'lucide-react'
import { useTheme, type Theme } from '@/lib/context/ThemeContext'
import { useProgress } from '@/lib/context/ProgressContext'
import OfflineStatusPill from '../OfflineStatusPill'

const THEME_ICONS = { light: Book, sepia: Moon, dark: Sun }
const THEME_ORDER: Theme[] = ['light', 'sepia', 'dark']

export default function AccountMenu() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const {
    setThemeSetting,
    user,
    signInWithGitHub,
    signOut,
    mounted,
    isOnline,
    offlineModeEnabled,
    isSyncing,
    isCaching,
    pendingOpsCount,
  } = useProgress()

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node))
        setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const isSettings = pathname === '/settings'
  const loggedIn = mounted && !!user && !user.is_anonymous
  const avatarUrl = loggedIn
    ? (user?.user_metadata?.avatar_url as string | undefined)
    : undefined
  const displayName = loggedIn
    ? ((user?.user_metadata?.full_name ||
        user?.user_metadata?.user_name ||
        user?.user_metadata?.name) as string | undefined)
    : undefined
  const initials = displayName
    ? displayName
        .trim()
        .split(/\s+/)
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : ''

  // Small status dot on the account avatar reflects offline/sync state at a glance
  const dotVariant = !isOnline
    ? 'offline'
    : isSyncing || isCaching
      ? 'busy'
      : offlineModeEnabled && pendingOpsCount > 0
        ? 'busy'
        : offlineModeEnabled
          ? 'ready'
          : ''

  const handleThemeChange = (t: Theme) => {
    setTheme(t)
    setThemeSetting(t)
  }

  return (
    <div className="more-menu-wrap" ref={wrapRef}>
      <button
        className="acct-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account and settings"
        title="Account and settings"
        aria-haspopup="true"
        aria-expanded={open}
      >
        <span className={`acct-avatar ${loggedIn ? 'is-logged-in' : ''}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" referrerPolicy="no-referrer" />
          ) : loggedIn ? (
            <span className="login-initials">
              {initials || <User size={15} />}
            </span>
          ) : (
            <User size={15} />
          )}
          {dotVariant && <span className={`acct-dot is-${dotVariant}`} />}
        </span>
        <ChevronDown className="acct-chevron" />
      </button>

      {open && (
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
            onClick={() => setOpen(false)}
          >
            <Settings /> Settings
          </Link>
          <button
            className="more-menu-item"
            role="menuitem"
            onClick={() => {
              ;(loggedIn ? signOut : signInWithGitHub)()
              setOpen(false)
            }}
          >
            {loggedIn ? <LogOut /> : <Github />}
            {loggedIn ? `Log out (${displayName || 'Account'})` : 'Log in'}
          </button>
        </div>
      )}
    </div>
  )
}
