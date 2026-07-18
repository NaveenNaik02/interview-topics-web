'use client'

import { Check } from 'lucide-react'

interface Props {
  title: string
  detail: string
}

export default function SaveToast({ title, detail }: Props) {
  return (
    <div className="save-toast" role="status">
      <span className="ic"><Check size={14} /></span>
      <div>
        <strong style={{ display: 'block' }}>{title}</strong>
        <span style={{ color: 'var(--text-subtle)' }}>{detail}</span>
      </div>
    </div>
  )
}
