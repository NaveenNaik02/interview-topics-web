'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Wifi, Plane, Loader2, X } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'

type ToastType = 'offline' | 'offline-nodl' | 'back-online' | 'syncing' | null

export default function OfflineToast() {
  const { isOnline, offlineModeEnabled, pendingOpsCount, isSyncing, syncNow } = useProgress()
  const [toast, setToast] = useState<ToastType>(null)
  const [showHint, setShowHint] = useState(false)
  const prevOnline = useRef(true)
  const prevSyncing = useRef(false)
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function dismiss() {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    setToast(null)
    setShowHint(false)
  }

  function autoDismiss(ms = 6000) {
    if (dismissTimer.current) clearTimeout(dismissTimer.current)
    dismissTimer.current = setTimeout(dismiss, ms)
  }

  // Track online/offline transitions
  useEffect(() => {
    const wasOnline = prevOnline.current
    prevOnline.current = isOnline

    if (wasOnline && !isOnline) {
      // Just went offline — show different toast depending on whether files are downloaded
      setShowHint(false)
      if (offlineModeEnabled) {
        setToast('offline')
      } else {
        setToast('offline-nodl')
      }
      autoDismiss(6000)
    } else if (!wasOnline && isOnline) {
      // Just came back online — only show sync prompt if user has downloaded files
      if (offlineModeEnabled) {
        setShowHint(false)
        setToast('back-online')
        if (dismissTimer.current) clearTimeout(dismissTimer.current)
      } else {
        dismiss()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, offlineModeEnabled])

  // Track syncing state
  useEffect(() => {
    const wasSyncing = prevSyncing.current
    prevSyncing.current = isSyncing

    if (!wasSyncing && isSyncing) {
      setShowHint(false)
      setToast('syncing')
      if (dismissTimer.current) clearTimeout(dismissTimer.current)
    } else if (wasSyncing && !isSyncing) {
      autoDismiss(2000)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSyncing])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (dismissTimer.current) clearTimeout(dismissTimer.current) }
  }, [])

  if (!toast) return null

  return (
    <div className={`of-toast of-toast--${toast}`} role="alert" aria-live="polite">
      <div className="of-toast-inner">
        <div className="of-toast-icon">
          {(toast === 'offline' || toast === 'offline-nodl') && <Plane size={16} />}
          {toast === 'back-online' && <Wifi size={16} />}
          {toast === 'syncing' && <Loader2 size={16} className="op-pill-spin" />}
        </div>
        <div className="of-toast-body">
          {toast === 'offline' && (
            <>
              <div className="of-toast-title">You're offline</div>
              <div className="of-toast-desc">Your progress is safe — it's saved on this device.</div>
            </>
          )}
          {toast === 'offline-nodl' && (
            <>
              <div className="of-toast-title">You're offline — content unavailable</div>
              <div className="of-toast-desc">You haven't downloaded this content, so questions can't be opened until you reconnect.</div>
            </>
          )}
          {toast === 'back-online' && (
            <>
              <div className="of-toast-title">You're back online</div>
              <div className="of-toast-desc">Sync your progress with your saved offline copy?</div>
              {showHint && (
                <div className="of-toast-hint">You can sync later from the status menu, top-right.</div>
              )}
              <div className="of-toast-actions">
                <button
                  className="of-toast-btn of-toast-btn--primary"
                  onClick={() => { syncNow(); dismiss() }}
                >
                  Sync now
                </button>
                <button
                  className="of-toast-btn"
                  onClick={() => setShowHint(true)}
                >
                  Not now
                </button>
              </div>
            </>
          )}
          {toast === 'syncing' && (
            <>
              <div className="of-toast-title">Syncing…</div>
              <div className="of-toast-desc">Updating your saved offline copy.</div>
            </>
          )}
        </div>
        {toast !== 'syncing' && (
          <button className="of-toast-close" onClick={dismiss} aria-label="Dismiss">
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}
