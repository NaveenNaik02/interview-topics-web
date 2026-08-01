'use client'

import { useState } from 'react'
import { Trash2, Sparkles, Bookmark, BookOpen } from 'lucide-react'
import { useProgress } from '@/lib/context/ProgressContext'
import { useTopicGroups } from '@/lib/context/TopicsContext'
import { findGroupForSection } from '@/lib/topics'
import type { SetAsideItem } from '@/lib/db/setAside'
import AddQuestionModal from './AddQuestionModal'
import InboxCaptureModal from './InboxCaptureModal'

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

type Tab = 'captured' | 'aside'

export default function InboxClient() {
  const { inboxItems, setAsideItems, mounted, removeInboxItem, removeSetAsideItem } = useProgress()
  const groups = useTopicGroups()
  const [tab, setTab] = useState<Tab>('captured')
  const [assigning, setAssigning] = useState<{ id: string; text: string } | null>(null)
  const [assigningAside, setAssigningAside] = useState<SetAsideItem | null>(null)
  const [capturing, setCapturing] = useState(false)

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="ic-page-head">
          <div>
            <div className="eyebrow">Save for later</div>
            <h1 className="subtopic-title">Inbox</h1>
            <p className="build-lede">New questions waiting on an answer, and ones you&apos;ve set aside — assign each to a topic whenever you&apos;re ready.</p>
          </div>
          <button className="btn btn-primary ic-page-cta" onClick={() => setCapturing(true)}>
            <Bookmark size={14} />Save a question
          </button>
        </div>
      </div>

      <div className="ic-tabs">
        <button type="button" className={`ic-tab ${tab === 'captured' ? 'active' : ''}`} onClick={() => setTab('captured')}>
          Captured<span className="ic-tab-count">{inboxItems.length}</span>
        </button>
        <button type="button" className={`ic-tab ${tab === 'aside' ? 'active' : ''}`} onClick={() => setTab('aside')}>
          Set aside<span className="ic-tab-count">{setAsideItems.length}</span>
        </button>
      </div>

      {!mounted ? null : tab === 'captured' ? (
        inboxItems.length === 0 ? (
          <div className="empty-set">
            <div className="es-title">Nothing here yet</div>
            <div className="es-sub">Use &quot;Save a question&quot; above to capture something without picking a topic first.</div>
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
        )
      ) : setAsideItems.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">Nothing set aside</div>
          <div className="es-sub">Use &quot;Set aside&quot; on a question&apos;s menu to send it here without deleting it.</div>
        </div>
      ) : (
        <div className="ic-list">
          {setAsideItems.map((it) => {
            const groupName = findGroupForSection(groups, { topic: it.topic, file: it.file, label: it.label })?.groupName
            return (
              <div className="sa-card" key={it.id}>
                {groupName && (
                  <span className="sa-crumb"><BookOpen />{groupName} › {it.label}</span>
                )}
                <div className="sa-card-q" dangerouslySetInnerHTML={{ __html: it.title }} />
                <div className="sa-card-a" dangerouslySetInnerHTML={{ __html: it.bodyHtml }} />
                <div className="sa-card-foot">
                  <span className="ic-time" style={{ marginRight: 'auto' }}>set aside · {timeAgo(it.createdAt)}</span>
                  <button className="ic-action" onClick={() => removeSetAsideItem(it.id)}><Trash2 size={12} />Discard</button>
                  <button className="ic-action primary" onClick={() => setAssigningAside(it)}><Sparkles size={12} />Assign to a topic</button>
                </div>
              </div>
            )
          })}
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

      {assigningAside && (
        <AddQuestionModal
          defaultSection={{ topic: assigningAside.topic, file: assigningAside.file, label: assigningAside.label }}
          prefillTitle={assigningAside.title}
          prefillMarkdown={assigningAside.markdown}
          prefillLang={assigningAside.lang}
          prefillTags={assigningAside.tags}
          prefillProblem={assigningAside.problem}
          fromSetAsideId={assigningAside.id}
          onClose={() => setAssigningAside(null)}
          onSaved={() => setAssigningAside(null)}
        />
      )}

      {capturing && (
        <InboxCaptureModal
          onClose={() => setCapturing(false)}
          onSaved={() => setCapturing(false)}
        />
      )}
    </div>
  )
}
