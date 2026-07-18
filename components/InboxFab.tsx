'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import InboxCaptureModal from './InboxCaptureModal'

export default function InboxFab() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  if (pathname === '/settings') return null

  return (
    <>
      <button
        className="fab fab-secondary"
        title="Save a question for later"
        aria-label="Save for later"
        onClick={() => setOpen(true)}
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
