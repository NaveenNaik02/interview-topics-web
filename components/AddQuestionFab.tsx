'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { findSection, sectionUrl } from '@/lib/topics'
import { useTopicGroups } from '@/lib/TopicsContext'
import { useFabDrag } from '@/lib/useFabDrag'
import AddQuestionModal from './AddQuestionModal'
import AddTopicModal from './AddTopicModal'

export default function AddQuestionFab() {
  const pathname = usePathname()
  const router = useRouter()
  const groups = useTopicGroups()
  const [open, setOpen] = useState(false)
  const { style, handlers } = useFabDrag()

  // Inbox has its own static "Save a question" button in the page header
  // instead; Priority Mix has no capture entry point at all.
  if (pathname === '/settings' || pathname === '/inbox' || pathname === '/priority-mix') return null

  const isHome = pathname === '/'
  const currentSection = findSection(groups, pathname.split('/').filter(Boolean))

  return (
    <>
      <button
        className="fab"
        style={style}
        title={isHome ? 'Add topic' : 'Add question'}
        aria-label={isHome ? 'Add topic' : 'Add question'}
        onClick={() => setOpen(true)}
        {...handlers}
      >
        <Plus size={22} />
      </button>
      {open && (
        isHome ? (
          <AddTopicModal
            onClose={() => setOpen(false)}
            onSaved={(result) => {
              setOpen(false)
              if (result.kind === 'subtopic') {
                router.push(sectionUrl(result.section))
              } else {
                router.refresh()
              }
            }}
          />
        ) : (
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
        )
      )}
    </>
  )
}
