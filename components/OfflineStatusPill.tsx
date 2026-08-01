'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Wifi, Send, RefreshCw, Loader2, Download, CloudDownload } from 'lucide-react'
import { useProgress } from '@/lib/context/ProgressContext'
import { useTopicGroups } from '@/lib/context/TopicsContext'

function relativeTime(isoStr: string | null): string {
  if (!isoStr) return 'a while ago'
  const diff = Date.now() - new Date(isoStr).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  return `${Math.floor(diff / 3_600_000)}h ago`
}

export default function OfflineStatusPill() {
  const {
    isOnline, offlineModeEnabled, isCaching, cachingProgress,
    pendingOpsCount, isSyncing, cachedAt, stats,
    enableOfflineMode, disableOfflineMode, syncNow,
  } = useProgress()
  const groups = useTopicGroups()
  const totalUrls = useMemo(() => 1 + groups.flatMap(g => g.sections).length, [groups]) // dashboard + all sections
  const estMb = Math.round(totalUrls * 80 / 1024 * 10) / 10

  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  // Close popover on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Open popover via custom event (e.g. from "Offline options" button in modal)
  useEffect(() => {
    const handler = () => setOpen(true)
    document.addEventListener('open-offline-options', handler)
    return () => document.removeEventListener('open-offline-options', handler)
  }, [])

  // Determine pill state — show 'offline' whenever disconnected, regardless of download status
  let pillState: 'online' | 'downloading' | 'ready' | 'sync' | 'offline'
  if (isCaching) {
    pillState = 'downloading'
  } else if (!isOnline) {
    pillState = 'offline'
  } else if (offlineModeEnabled && pendingOpsCount > 0) {
    pillState = 'sync'
  } else if (offlineModeEnabled) {
    pillState = 'ready'
  } else {
    pillState = 'online'
  }

  const pct = cachingProgress
    ? Math.round((cachingProgress.done / cachingProgress.total) * 100)
    : 0

  function pillLabel() {
    switch (pillState) {
      case 'downloading': return `Saving ${pct}%`
      case 'ready':       return 'Offline ready'
      case 'sync':        return 'Sync available'
      case 'offline':     return 'Offline'
      default:            return 'Online'
    }
  }

  function PillIcon() {
    switch (pillState) {
      case 'downloading': return <Loader2 size={12} className="op-pill-spin" />
      case 'ready':       return <RefreshCw size={12} />
      case 'sync':        return <RefreshCw size={12} />
      case 'offline':     return <Send size={12} />
      default:            return <Wifi size={12} />
    }
  }

  return (
    <div className="op-wrap" ref={wrapRef}>
      <button
        className={`op-pill op-pill--${pillState}`}
        onClick={() => setOpen(o => !o)}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {pillState !== 'downloading' && (
          <span className={`op-dot op-dot--${pillState}`} />
        )}
        <PillIcon />
        <span>{pillLabel()}</span>
      </button>

      {open && (
        <div className="op-popover" role="dialog" aria-label="Offline access">
          <PopoverContent
            pillState={pillState}
            offlineModeEnabled={offlineModeEnabled}
            pct={pct}
            cachingProgress={cachingProgress}
            pendingOpsCount={pendingOpsCount}
            isSyncing={isSyncing}
            cachedAt={cachedAt}
            totalQuestions={stats.total}
            totalUrls={totalUrls}
            estMb={estMb}
            onDownload={() => { enableOfflineMode() }}
            onCheckUpdates={() => { enableOfflineMode() }}
            onSyncNow={() => { syncNow() }}
            onRemove={() => { disableOfflineMode(); setOpen(false) }}
          />
        </div>
      )}
    </div>
  )
}

interface PopoverContentProps {
  pillState: 'online' | 'downloading' | 'ready' | 'sync' | 'offline'
  offlineModeEnabled: boolean
  pct: number
  cachingProgress: { done: number; total: number } | null
  pendingOpsCount: number
  isSyncing: boolean
  cachedAt: string | null
  totalQuestions: number
  totalUrls: number
  estMb: number
  onDownload: () => void
  onCheckUpdates: () => void
  onSyncNow: () => void
  onRemove: () => void
}

function PopoverContent({
  pillState, offlineModeEnabled, pct, cachingProgress, pendingOpsCount, isSyncing,
  cachedAt, totalQuestions, totalUrls, estMb, onDownload, onCheckUpdates, onSyncNow, onRemove,
}: PopoverContentProps) {
  // Only "downloaded" if the user actually opted in — not just because network is offline
  const isDownloaded = offlineModeEnabled && (pillState === 'ready' || pillState === 'sync' || pillState === 'offline')
  const displayQ = totalQuestions || totalUrls * 10

  return (
    <>
      <div className="op-popover-header">
        <div className="op-popover-icon">
          <CloudDownload size={20} />
        </div>
        <div>
          <div className="op-popover-title">Offline access</div>
          <div className="op-popover-sub">
            {isDownloaded ? 'Saved on this device' : 'Not downloaded'}
          </div>
        </div>
      </div>

      {/* Offline, not downloaded */}
      {pillState === 'offline' && !isDownloaded && (
        <>
          <p className="op-popover-desc">
            You&apos;re offline and haven&apos;t downloaded any content. Connect to the internet to download
            all questions for offline study.
          </p>
          <div className="op-popover-meta">
            <span>📚 {displayQ} questions</span>
            <span>⬇ ≈ {estMb} MB</span>
          </div>
          <button className="op-btn-primary" disabled style={{ opacity: 0.5, cursor: 'not-allowed' }}>
            <Download size={14} />
            Download for offline
          </button>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-subtle)', marginTop: 6, textAlign: 'center' }}>
            Reconnect to enable downloads
          </p>
        </>
      )}

      {/* Not downloaded + idle (online) */}
      {pillState === 'online' && (
        <>
          <p className="op-popover-desc">
            Download all {displayQ} questions, answers and code snippets so you can keep
            studying with no connection. Nothing is downloaded until you opt in.
          </p>
          <div className="op-popover-meta">
            <span>📚 {displayQ} questions</span>
            <span>⬇ ≈ {estMb} MB</span>
          </div>
          <button className="op-btn-primary" onClick={onDownload}>
            <Download size={14} />
            Download for offline
          </button>
        </>
      )}

      {/* Downloading */}
      {pillState === 'downloading' && (
        <div className="op-caching">
          <p className="op-caching-label">Saving questions, answers & assets…</p>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%`, transition: 'width 0.3s' }} />
          </div>
          <div className="op-caching-row">
            <span className="op-caching-label">Downloading…</span>
            <span className="op-caching-label">{pct}%</span>
          </div>
          {cachingProgress && (
            <p className="op-caching-label" style={{ marginTop: 4 }}>
              {cachingProgress.done} / {cachingProgress.total} pages
            </p>
          )}
        </div>
      )}

      {/* Ready */}
      {(pillState === 'ready' || pillState === 'offline') && isDownloaded && (
        <>
          <div className="op-state-card op-state-card--ready">
            <RefreshCw size={16} style={{ flexShrink: 0 }} />
            <div>
              <div className="op-state-card-title">Available offline</div>
              <div className="op-state-card-sub">
                All {displayQ} questions · updated {relativeTime(cachedAt)}
              </div>
            </div>
          </div>
          <button className="op-btn-secondary" onClick={onCheckUpdates}>
            <RefreshCw size={14} />
            Check for updates
          </button>
          <button className="op-btn-remove" onClick={onRemove}>Remove download</button>
        </>
      )}

      {/* Sync available */}
      {pillState === 'sync' && (
        <>
          <div className="op-state-card op-state-card--sync">
            <RefreshCw size={16} style={{ flexShrink: 0 }} />
            <div>
              <div className="op-state-card-title">Sync available</div>
              <div className="op-state-card-sub">
                You reconnected — update your saved copy.
                {pendingOpsCount > 0 && ` (${pendingOpsCount} change${pendingOpsCount > 1 ? 's' : ''} pending)`}
              </div>
            </div>
          </div>
          <button className="op-btn-primary" onClick={onSyncNow} disabled={isSyncing}>
            {isSyncing ? <Loader2 size={16} className="op-pill-spin" /> : <RefreshCw size={16} />}
            {isSyncing ? 'Syncing…' : 'Sync now'}
          </button>
          <button className="op-btn-remove" onClick={onRemove}>Remove download</button>
        </>
      )}
    </>
  )
}
