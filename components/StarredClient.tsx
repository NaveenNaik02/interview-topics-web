'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Send } from 'lucide-react'
import { useProgress } from '@/lib/ProgressContext'
import { useTopicGroups } from '@/lib/TopicsContext'
import { sectionUrl, findGroupForSection, type SectionMeta } from '@/lib/topics'
import { deleteQuestion } from '@/lib/actions/questions'
import { setAsideQuestion } from '@/lib/actions/setAside'
import type { PriorityLevel } from '@/lib/offlineSync'
import QuestionItem from './QuestionItem'
import AddQuestionModal, { type EditingQuestion } from './AddQuestionModal'
import MoveQuestionModal from './MoveQuestionModal'
import SaveToast from './SaveToast'
import { htmlToMarkdown } from '@/lib/htmlToMarkdown'

export interface StarredQuestion {
  id: string
  number: number
  title: string
  bodyHtml: string
  markdown?: string | null
  createdBy?: string | null
  topic: string
  file: string
  label: string
  groupSlug: string
  lang?: string | null
  tags?: string | null
  problem?: string | null
  priority: PriorityLevel | null
}

interface Props {
  questions: StarredQuestion[]
}

// A flat, manually-curated shortlist for a last-look pass right before an
// interview — orthogonal to priority/status, no filters, just the questions
// the user personally starred. Mirrors PriorityMixClient's question-list
// wiring (edit/move/delete/set-aside) minus its builder UI.
export default function StarredClient({ questions }: Props) {
  const { isComplete, toggle, setPriority, isStarred, toggleStar, isOnline, offlineModeEnabled, mounted, navigateAfterMove, user, appendSetAsideItem } = useProgress()
  const groups = useTopicGroups()
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [showOfflineModal, setShowOfflineModal] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<EditingQuestion | null>(null)
  const [movingQuestion, setMovingQuestion] = useState<{ id: string; label: string; section: SectionMeta } | null>(null)
  const [moveToast, setMoveToast] = useState<string | null>(null)
  const [asideToast, setAsideToast] = useState(false)

  const requireOnline = () => {
    if (!isOnline && !offlineModeEnabled) { setShowOfflineModal(true); return true }
    return false
  }

  // Filter reactively off the live store (not just the server snapshot) so
  // unstarring a question here removes its row immediately — same as
  // PriorityMixClient's `flagged`/`matched` for priority. Before mount,
  // isStarred always reads false, so keep the server-provided list as-is to
  // avoid a flash-empty before the store finishes loading.
  const starred = useMemo(
    () => (mounted ? questions.filter(q => isStarred(q.id)) : questions),
    [questions, isStarred, mounted]
  )

  return (
    <div className="content-wrapper">
      <div className="subtopic-header" style={{ marginBottom: 'var(--s-5)' }}>
        <div className="eyebrow">Shortlist</div>
        <h1 className="subtopic-title">Starred</h1>
        <p className="build-lede">Your hand-picked questions for a quick pass right before the interview.</p>
      </div>

      {starred.length === 0 ? (
        <div className="empty-set">
          <div className="es-title">Nothing starred yet</div>
          <div className="es-sub">Star a question from any topic — look for the star icon on each row — to build your pre-interview shortlist.</div>
        </div>
      ) : (
        <div className="questions-list">
          {starred.map((q) => {
            const group = findGroupForSection(groups, { topic: q.topic, file: q.file, label: q.label })
            const section: SectionMeta = { topic: q.topic, file: q.file, label: q.label }
            const subKey = sectionUrl(section)
            const canManage = mounted && !!user && (q.createdBy === user.id || user.app_metadata?.is_admin === true)
            return (
              <QuestionItem
                key={q.id}
                q={{ id: q.id, number: q.number, title: q.title, bodyHtml: q.bodyHtml, problem: q.problem }}
                isDone={isComplete(q.id)}
                isOpen={openId === q.id}
                priority={q.priority}
                onToggleOpen={() => {
                  if (requireOnline()) return
                  setOpenId(openId === q.id ? null : q.id)
                }}
                onToggleDone={() => {
                  if (requireOnline()) return
                  toggle(q.id)
                }}
                onSetPriority={(level) => setPriority(q.id, level)}
                crumb={{ topicLabel: group?.groupName ?? q.groupSlug, subLabel: q.label, href: subKey }}
                isStarred={isStarred(q.id)}
                onToggleStar={() => toggleStar(q.id)}
                onEdit={canManage ? () => setEditingQuestion({
                  id: q.id,
                  title: q.title,
                  markdown: q.markdown || htmlToMarkdown(q.bodyHtml),
                  section,
                  priority: q.priority,
                  lang: q.lang,
                  tags: q.tags,
                  problem: q.problem,
                }) : undefined}
                onMove={canManage ? () => setMovingQuestion({ id: q.id, label: q.title, section }) : undefined}
                onSetAside={canManage ? async () => {
                  const item = await setAsideQuestion(q.id)
                  appendSetAsideItem(item)
                  setAsideToast(true)
                  setTimeout(() => setAsideToast(false), 3600)
                  router.refresh()
                } : undefined}
                onDelete={canManage ? async () => {
                  await deleteQuestion(q.id)
                  router.refresh()
                } : undefined}
              />
            )
          })}
        </div>
      )}

      {showOfflineModal && (
        <div className="confirm-overlay" onClick={() => setShowOfflineModal(false)}>
          <div className="confirm-dialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
            <div className="offline-notavail-icon">
              <Send size={22} />
            </div>
            <h2 className="confirm-title">Not available offline</h2>
            <p className="confirm-message">
              You&apos;re offline and haven&apos;t downloaded this content yet, so questions and answers can&apos;t be
              opened right now. Reconnect, or download an offline copy next time you&apos;re online to study anywhere.
            </p>
            <div className="confirm-actions">
              <button className="btn btn-ghost" onClick={() => setShowOfflineModal(false)}>Dismiss</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setShowOfflineModal(false)
                  document.dispatchEvent(new Event('open-offline-options'))
                }}
              >
                Offline options
              </button>
            </div>
          </div>
        </div>
      )}

      {editingQuestion && (
        <AddQuestionModal
          editing={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={() => {
            setEditingQuestion(null)
            router.refresh()
          }}
        />
      )}

      {movingQuestion && (
        <MoveQuestionModal
          groups={groups}
          questionId={movingQuestion.id}
          label={movingQuestion.label}
          currentSection={movingQuestion.section}
          onClose={() => setMovingQuestion(null)}
          onMoved={(destination) => {
            setMovingQuestion(null)
            if (navigateAfterMove) {
              router.push(sectionUrl(destination))
            } else {
              const destGroup = findGroupForSection(groups, destination)
              setMoveToast(`${destGroup?.groupName ?? ''} → ${destination.label}`)
              setTimeout(() => setMoveToast(null), 3600)
              router.refresh()
            }
          }}
        />
      )}

      {moveToast && <SaveToast title="Moved" detail={moveToast} />}
      {asideToast && <SaveToast title="Set aside" detail="Find it in Inbox whenever you're ready." />}
    </div>
  )
}
