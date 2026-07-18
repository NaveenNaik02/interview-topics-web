'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Pencil, FolderInput, Trash2, MoreVertical } from 'lucide-react'

interface Props {
  getText: () => string
  onEdit?: () => void
  onMove?: () => void
  onDelete?: () => void
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

// Row overflow menu (kebab) — Copy / Edit / Delete. Portal-rendered so the
// dropdown isn't clipped by the row's own layout, positioned from the
// trigger button's rect the same way AqSelect/OfflineStatusPill anchor theirs.
export default function RowActions({ getText, onEdit, onMove, onDelete }: Props) {
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
              <button type="button" className="kebab-item" onClick={handleCopy}>
                <Copy /> Copy
              </button>
              {onEdit && (
                <button type="button" className="kebab-item" onClick={() => { onEdit(); close() }}>
                  <Pencil /> Edit
                </button>
              )}
              {onMove && (
                <button type="button" className="kebab-item" onClick={() => { onMove(); close() }}>
                  <FolderInput /> Move to…
                </button>
              )}
              {onDelete && (
                <>
                  <div className="kebab-sep" />
                  <button type="button" className="kebab-item danger" onClick={() => setConfirming(true)}>
                    <Trash2 /> Delete
                  </button>
                </>
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
