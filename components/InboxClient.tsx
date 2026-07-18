'use client'

import { useState } from 'react'
import { Trash2, Sparkles } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import AddQuestionModal from './AddQuestionModal'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

export default function InboxClient() {
  const { inboxItems, mounted, removeInboxItem } = useProgress()
  const [assigning, setAssigning] = useState<{ id: string; text: string } | null>(null)

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Save for later</div>
        <h1 className="subtopic-title">Inbox</h1>
        <p className="build-lede">Questions you saved for later — assign each to a topic whenever you&apos;re ready.</p>
      </div>

      {!mounted ? null : inboxItems.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">Nothing here yet</div>
          <div className="es-sub">Use the bookmark button to save a question without picking a topic first.</div>
        </div>
      ) : (
        <div className="ic-list">
          {inboxItems.map((it) => (
            <div className="ic-card" key={it.id}>
              <div className="ic-card-top"><span className="ic-time">{timeAgo(it.createdAt)}</span></div>
              <p className="ic-card-text">{it.text}</p>
              <div className="ic-card-actions">
                <button className="ic-action" onClick={() => removeInboxItem(it.id)}><Trash2 size={12} />Discard</button>
                <button className="ic-action primary" onClick={() => setAssigning(it)}><Sparkles size={12} />Assign</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {assigning && (
        <AddQuestionModal
          prefillTitle={assigning.text}
          fromInboxId={assigning.id}
          onClose={() => setAssigning(null)}
          onSaved={() => setAssigning(null)}
        />
      )}
    </div>
  )
}
