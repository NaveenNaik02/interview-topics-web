'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Inbox, Loader2 } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { addInboxItem } from '@/lib/actions/inbox'

interface Props {
  onClose: () => void
  onSaved: () => void
}

// Deliberately has NO topic/subtopic fields — the whole point is
// zero-friction capture. Sorting happens later, from the Inbox page.
export default function InboxCaptureModal({ onClose, onSaved }: Props) {
  const { appendInboxItem } = useProgress()
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { taRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const canSave = text.trim().length > 3 && !saving

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const item = await addInboxItem(text)
      appendInboxItem(item)
      onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save — try again.')
      setSaving(false)
    }
  }

  return (
    <div className="modal-scrim" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="aq-modal" style={{ maxWidth: 540 }} role="dialog" aria-modal="true" aria-label="Save for later">
        <div className="aq-head">
          <h2>Save for later</h2>
          <button className="aq-close" onClick={onClose} aria-label="Close" title="Close"><X size={15} /></button>
        </div>
        <div className="aq-body">
          <div className="aq-field">
            <label htmlFor="ic-text">Question <span className="aq-customize-sub">(paste the answer too, if you have it)</span></label>
            <textarea
              id="ic-text" ref={taRef} className="aq-input aq-problem-input" rows={7}
              placeholder="Paste or jot down the question here — no need to sort it yet."
              value={text} onChange={(e) => setText(e.target.value)}
            />
          </div>
          {error && <div className="aq-gen-error">{error}</div>}
        </div>
        <div className="aq-foot">
          <span className="aq-foot-left"><Inbox size={13} />Goes straight to your Inbox — pick a topic later, whenever you&apos;re ready.</span>
          <div className="aq-foot-actions">
            <button className="btn-cancel" onClick={onClose}>Cancel</button>
            <button className={`btn-primary btn-save ${saving ? 'saving' : ''}`} disabled={!canSave} onClick={handleSave}>
              {saving ? <Loader2 size={14} className="aq-spin" /> : null}
              {saving ? 'Saving…' : 'Save to Inbox'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
