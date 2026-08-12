import { useRef, useState } from 'react'
import { capAnswerVersions } from '../markdownPreview'
import type { AnswerVersion } from '../types'

// Version history for the answer editor: every Generate/Format snapshots
// whatever's there before overwriting it, so switching drafts (or back to
// the original saved answer) never loses work. Manual typing doesn't create
// a snapshot — it just detaches from whichever version was active.
export function useAnswerVersions(markdown: string, setMarkdown: (v: string) => void, originalMarkdown: string) {
  const [answerVersions, setAnswerVersions] = useState<AnswerVersion[]>(() => (
    originalMarkdown.trim() ? [{ id: 'original', label: 'Original', text: originalMarkdown }] : []
  ))
  const [activeVersionId, setActiveVersionId] = useState<string | null>(() => (originalMarkdown.trim() ? 'original' : null))
  const draftCountRef = useRef(0)

  const snapshotCurrentAnswer = () => {
    if (!markdown.trim()) return
    setAnswerVersions(prev => {
      if (prev.length && prev[prev.length - 1].text === markdown) return prev
      const label = activeVersionId === 'original' ? 'Original' : prev.find(v => v.id === activeVersionId)?.label
      if (label && prev.some(v => v.text === markdown)) return prev
      draftCountRef.current += 1
      return capAnswerVersions([...prev, { id: `v${Date.now()}`, label: label ?? `Draft ${draftCountRef.current}`, text: markdown }])
    })
  }

  const addAnswerVersion = (text: string) => {
    draftCountRef.current += 1
    const id = `v${Date.now()}`
    setAnswerVersions(prev => capAnswerVersions([...prev, { id, label: `Draft ${draftCountRef.current}`, text }]))
    setActiveVersionId(id)
  }

  const handleMarkdownChange = (value: string) => {
    setMarkdown(value)
    setActiveVersionId(null)
  }

  const handleSelectAnswerVersion = (v: AnswerVersion) => {
    setMarkdown(v.text)
    setActiveVersionId(v.id)
  }

  return { answerVersions, activeVersionId, snapshotCurrentAnswer, addAnswerVersion, handleMarkdownChange, handleSelectAnswerVersion }
}
