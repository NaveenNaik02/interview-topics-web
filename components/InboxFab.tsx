'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { useFabDrag } from '@/lib/useFabDrag'
import InboxCaptureModal from './InboxCaptureModal'

export default function InboxFab() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const { style, handlers } = useFabDrag()

  // Inbox has its own static "Save a question" button in the page header
  // instead; Priority Mix has no capture entry point at all.
  if (pathname === '/settings' || pathname === '/inbox' || pathname === '/priority-mix') return null

  return (
    <>
      <button
        className="fab fab-secondary"
        style={style}
        title="Save a question for later"
        aria-label="Save for later"
        onClick={() => setOpen(true)}
        {...handlers}
      >
        <Bookmark size={18} />
      </button>
      {open && (
        <InboxCaptureModal
          onClose={() => setOpen(false)}
          onSaved={() => setOpen(false)}
        />
      )}
    </>
  )
}
