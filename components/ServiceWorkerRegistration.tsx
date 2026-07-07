'use client'

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          // When a new SW activates (after update), the SW posts SW_UPDATED → reload for fresh chunks
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data?.type === 'SW_UPDATED') window.location.reload()
          })
          reg.addEventListener('updatefound', () => {
            reg.update().catch(() => {})
          })
        })
        .catch((err) => console.error('[SW] Registration failed:', err))
    } else {
      // In development, unregister any existing SW so stale CacheFirst responses don't mask code changes
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
    }
  }, [])
  return null
}
