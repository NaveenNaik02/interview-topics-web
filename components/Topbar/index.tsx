'use client'

import { useRef } from 'react'
import dynamic from 'next/dynamic'
import { Menu, Search, X } from 'lucide-react'
import { useDrawer } from '@/lib/context/DrawerContext'
import { useSearch } from '@/lib/context/SearchContext'
import Breadcrumbs from './Breadcrumbs'

const AccountMenu = dynamic(() => import('./AccountMenu'))

export default function Topbar() {
  const { setDrawerOpen } = useDrawer()
  const { query, setQuery } = useSearch()
  const inputRef = useRef<HTMLInputElement>(null)

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
        <Breadcrumbs />
      </div>
      <div className="topbar-right flex items-center gap-2">
        <div className="search-box">
          <span className="search-icon">
            <Search size={15} />
          </span>
          <input
            ref={inputRef}
            type="text"
            className="search-input"
            placeholder="Search questions…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setQuery('')
            }}
            aria-label="Search questions"
          />
          {query && (
            <button
              className="search-clear"
              onClick={() => {
                setQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Clear search"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <AccountMenu />
      </div>
    </header>
  )
}
