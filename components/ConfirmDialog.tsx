'use client'

import { useEffect, useState } from 'react'

interface Props {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
  requireText?: string
  danger?: boolean
}

export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, requireText, danger }: Props) {
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) setTyped('')
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (!open) return null

  const locked = !!requireText && typed.trim().toLowerCase() !== requireText.toLowerCase()

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-dialog" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        {requireText && (
          <div className="confirm-field">
            <label className="confirm-label">
              Type <strong>{requireText}</strong> to confirm
            </label>
            <input
              type="text"
              className="confirm-input"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !locked) onConfirm() }}
              placeholder={requireText}
              autoFocus
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        )}
        <div className="confirm-actions">
          <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={locked}
            autoFocus={!requireText}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
