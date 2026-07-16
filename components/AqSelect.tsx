'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

export interface AqSelectOption { value: string; label: string; sub?: string }

// Custom-styled dropdown replacing native <select> everywhere in the Add
// Question / Add Topic modals, so the menu matches the app's own
// floating-panel look instead of the browser's default listbox chrome.
export default function AqSelect({ id, value, onChange, options }: { id?: string; value: string; onChange: (v: string) => void; options: AqSelectOption[] }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const current = options.find(o => o.value === value)

  useEffect(() => {
    if (!open) return
    const onDocDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDocDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="aq-dd" ref={wrapRef}>
      <button
        type="button"
        id={id}
        className="aq-select aq-dd-trigger"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="aq-dd-value">{current ? current.label : '—'}</span>
        <ChevronDown className="aq-dd-chevron" size={12} />
      </button>
      {open && (
        <div className="aq-dd-menu" role="listbox">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              role="option"
              aria-selected={o.value === value}
              className={`aq-dd-item ${o.value === value ? 'on' : ''}`}
              onClick={() => { onChange(o.value); setOpen(false) }}
            >
              <span className="aq-dd-item-label">{o.label}</span>
              {o.sub ? <span className="aq-dd-item-sub">{o.sub}</span> : null}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
