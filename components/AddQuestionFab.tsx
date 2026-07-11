'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { findSection, sectionUrl } from '@/lib/topics'
import AddQuestionModal from './AddQuestionModal'

export default function AddQuestionFab() {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const isSettings = pathname === '/settings'
  if (isSettings) return null

  const currentSection = findSection(pathname.split('/').filter(Boolean))

  return (
    <>
      <button className="fab" title="Add question" aria-label="Add question" onClick={() => setOpen(true)}>
        <Plus size={22} />
      </button>
      {open && (
        <AddQuestionModal
          defaultSection={currentSection ?? undefined}
          onClose={() => setOpen(false)}
          onSaved={(_question, section) => {
            setOpen(false)
            const url = sectionUrl(section)
            if (pathname === url) router.refresh()
            else router.push(url)
          }}
        />
      )}
    </>
  )
}
