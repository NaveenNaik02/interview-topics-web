'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function SidebarNavLink({
  href,
  icon,
  label,
  badge,
  onClick,
}: {
  href: string
  icon: React.ReactNode
  label: string
  badge?: number
  onClick: () => void
}) {
  const pathname = usePathname()
  const isActive = pathname === href

  if (badge === undefined) {
    return (
      <Link
        href={href}
        className={`subtopic-row ${isActive ? 'active' : ''}`}
        onClick={onClick}
        style={{ marginBottom: 8 }}
        prefetch={false}
      >
        <span
          style={{
            display: 'inline-flex',
            color: 'var(--text-subtle)',
            width: 16,
            height: 16,
          }}
        >
          {icon}
        </span>
        <span className="subtopic-name">{label}</span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      className={`subtopic-row ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ marginBottom: 8, justifyContent: 'space-between' }}
      prefetch={false}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            display: 'inline-flex',
            color: 'var(--text-subtle)',
            width: 16,
            height: 16,
          }}
        >
          {icon}
        </span>
        <span className="subtopic-name">{label}</span>
      </span>
      {badge > 0 && <span className="ic-nav-badge">{badge}</span>}
    </Link>
  )
}
