'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Pencil, FolderInput, Archive, Trash2, MoreVertical, Star, Contrast } from 'lucide-react'
import type { PriorityLevel } from '@/lib/types'

interface Props {
  getText: () => string
  onEdit?: () => void
  onMove?: () => void
  onSetAside?: () => void
  onDelete?: () => void
  isStarred?: boolean
  onToggleStar?: () => void
  isGreyZone?: boolean
  onToggleGreyZone?: () => void
  priority?: PriorityLevel | null
  onSetPriority?: (level: PriorityLevel | null) => void
}

function fallbackCopy(text: string) {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
  } catch {}
}

// Row overflow menu (kebab). The four one-shot actions sit in a compact icon
// strip across the top; the toggles and priority stack below it. Portal-
// rendered so the dropdown isn't clipped by the row's own layout, positioned
// from the trigger button's rect the same way AqSelect/OfflineStatusPill do.
export default function RowActions({ getText, onEdit, onMove, onSetAside, onDelete, isStarred, onToggleStar, isGreyZone, onToggleGreyZone, priority, onSetPriority }: Props) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const r = btnRef.current?.getBoundingClientRect()
    if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) })
  }, [])

  const close = () => { setOpen(false); setConfirming(false) }

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (open) { close(); return }
    place()
    setOpen(true)
  }

  // Flip above the trigger when the menu would run past the viewport bottom —
  // otherwise a row near the bottom of the screen opens a clipped menu that
  // can only be reached by scrolling, which closes it.
  useLayoutEffect(() => {
    if (!open || !pos) return
    const r = btnRef.current?.getBoundingClientRect()
    const h = popRef.current?.offsetHeight
    if (!r || !h) return
    const top = r.bottom + 6 + h > window.innerHeight - 8
      ? Math.max(8, r.top - 6 - h)
      : r.bottom + 6
    if (top !== pos.top) setPos({ ...pos, top })
  }, [open, pos, confirming])

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node) || btnRef.current?.contains(e.target as Node)) return
      close()
    }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onMove = () => close()
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
    }
  }, [open])

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = getText()
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text))
    } else {
      fallbackCopy(text)
    }
    close()
  }

  return (
    <div className={`kebab-wrap ${open ? 'open' : ''}`}>
      <button
        ref={btnRef}
        type="button"
        className="q-kebab"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="More actions"
        title="More actions"
      >
        <MoreVertical />
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="kebab-menu"
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right, zIndex: 400 }}
          onClick={(e) => e.stopPropagation()}
        >
          {!confirming ? (
            <>
              <div className="kb-icon-strip">
                <button type="button" className="kb-icon-btn" onClick={handleCopy}>
                  <Copy /> Copy
                </button>
                {onEdit && (
                  <button type="button" className="kb-icon-btn" onClick={() => { onEdit(); close() }}>
                    <Pencil /> Edit
                  </button>
                )}
                {onMove && (
                  <button type="button" className="kb-icon-btn" onClick={() => { onMove(); close() }}>
                    <FolderInput /> Move
                  </button>
                )}
                {onDelete && (
                  <button type="button" className="kb-icon-btn danger" onClick={() => setConfirming(true)}>
                    <Trash2 /> Delete
                  </button>
                )}
              </div>
              {onToggleStar && (
                <button type="button" className="kebab-item" onClick={() => { onToggleStar(); close() }}>
                  <Star fill={isStarred ? 'currentColor' : 'none'} /> {isStarred ? 'Unstar' : 'Star for review'}
                </button>
              )}
              {onToggleGreyZone && (
                <button type="button" className="kebab-item" onClick={() => { onToggleGreyZone(); close() }}>
                  <Contrast /> {isGreyZone ? 'Remove from Grey Zone' : 'Add to Grey Zone'}
                </button>
              )}
              {onSetPriority && (
                <div className="kebab-pri-row">
                  <button type="button" className={`kebab-pri high ${priority === 'high' ? 'sel' : ''}`} onClick={() => { onSetPriority(priority === 'high' ? null : 'high') }}><span className="dot" />High</button>
                  <button type="button" className={`kebab-pri med ${priority === 'med' ? 'sel' : ''}`} onClick={() => { onSetPriority(priority === 'med' ? null : 'med') }}><span className="dot" />Med</button>
                  <button type="button" className={`kebab-pri low ${priority === 'low' ? 'sel' : ''}`} onClick={() => { onSetPriority(priority === 'low' ? null : 'low') }}><span className="dot" />Low</button>
                </div>
              )}
              {onSetAside && (
                <button
                  type="button"
                  className="kebab-item"
                  onClick={() => { onSetAside(); close() }}
                  title="Keep it, but set it aside from this topic — find it later in the Inbox"
                >
                  <Archive /> Set aside
                </button>
              )}
            </>
          ) : (
            <div className="kebab-confirm">
              <div className="kebab-confirm-msg">Delete this question?</div>
              <div className="kebab-confirm-row">
                <button type="button" className="kebab-confirm-cancel" onClick={close}>Cancel</button>
                <button type="button" className="kebab-confirm-delete" onClick={() => { onDelete?.(); close() }}>Delete</button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
