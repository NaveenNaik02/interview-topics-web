'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createPortal } from 'react-dom'
import type { PriorityLevel } from '@/lib/offlineSync'

const PRI_LABEL: Record<PriorityLevel, string> = { high: 'High', med: 'Med', low: 'Low' }

const OPTIONS: { level: PriorityLevel | null; cls: string; label: string }[] = [
  { level: 'high', cls: 'high', label: 'High' },
  { level: 'med', cls: 'med', label: 'Med' },
  { level: 'low', cls: 'low', label: 'Low' },
  { level: null, cls: 'none', label: 'None' },
]

interface Props {
  value: PriorityLevel | null
  onChange: (level: PriorityLevel | null) => void
}

export default function PriorityPicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const popRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])

  const toggleOpen = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (!open && triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) })
    }
    setOpen(o => !o)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onClick = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return
      if (triggerRef.current?.contains(e.target as Node)) return
      close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onClick)
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onClick)
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [open, close])

  const pick = useCallback((level: PriorityLevel | null, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(level)
    close()
  }, [onChange, close])

  return (
    <div className={`pri-wrap ${open ? 'open' : ''}`}>
      <button
        ref={triggerRef}
        type="button"
        className={`pri-chip ${value ?? 'none'}`}
        onClick={toggleOpen}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Set importance"
      >
        <span className="dot" />
        {value ? PRI_LABEL[value] : 'Priority'}
      </button>
      {open && pos && createPortal(
        <div
          ref={popRef}
          className="pop-pills"
          role="menu"
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          onClick={(e) => e.stopPropagation()}
        >
          {OPTIONS.map(opt => (
            <button
              key={opt.cls}
              type="button"
              className={`pop-pill ${opt.cls} ${opt.level === value ? 'sel' : ''}`}
              onClick={(e) => pick(opt.level, e)}
            >
              <span className="dot" />
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}
