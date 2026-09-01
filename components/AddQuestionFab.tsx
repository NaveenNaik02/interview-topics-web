'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Plus } from 'lucide-react'
import { findSection, isCodeOutputSection, sectionUrl } from '@/lib/topics'
import { useAppStore } from '@/lib/stores/appStore';
import { useFabDrag } from '@/lib/useFabDrag'

// Rarely opened relative to every other page view (Add Question/Topic pull in
// marked + isomorphic-dompurify + AI action wiring) — load only when needed.
const AddQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.AddQuestionModal),
  { ssr: false },
)
const AddTopicModal = dynamic(() => import('./AddTopicModal'), { ssr: false })
const CodeQuestionModal = dynamic(
  () => import('@/features/authoring').then((m) => m.CodeQuestionModal),
  { ssr: false },
)

export default function AddQuestionFab() {
  const pathname = usePathname()
  const router = useRouter()
  const groups = useAppStore((s) => s.groups)
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
        ) : currentSection && isCodeOutputSection(currentSection) ? (
          <CodeQuestionModal
            section={currentSection}
            onClose={() => setOpen(false)}
            onSaved={() => {
              setOpen(false)
              router.refresh()
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
