'use client'

import { Check, AlertCircle } from 'lucide-react'

interface Props {
  title: string
  detail: string
  variant?: 'success' | 'error'
}

export default function SaveToast({ title, detail, variant = 'success' }: Props) {
  return (
    <div className={`save-toast ${variant}`} role="status">
      <span className="ic">
        {variant === 'error' ? <AlertCircle size={14} /> : <Check size={14} />}
      </span>
      <div>
        <strong style={{ display: 'block' }}>{title}</strong>
        <span style={{ color: 'var(--text-subtle)' }}>{detail}</span>
      </div>
    </div>
  )
}

