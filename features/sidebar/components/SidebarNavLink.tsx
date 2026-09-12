'use client'

import { usePathname } from 'next/navigation'
import { HoverPrefetchLink } from '@/components/HoverPrefetchLink'

export const SidebarNavLink = ({
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
}) => {
  const pathname = usePathname()
  const isActive = pathname === href

  if (badge === undefined) {
    return (
      <HoverPrefetchLink
        href={href}
        className={`subtopic-row ${isActive ? 'active' : ''}`}
        onClick={onClick}
        style={{ marginBottom: 8 }}
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
      </HoverPrefetchLink>
    )
  }

  return (
    <HoverPrefetchLink
      href={href}
      className={`subtopic-row ${isActive ? 'active' : ''}`}
      onClick={onClick}
      style={{ marginBottom: 8, justifyContent: 'space-between' }}
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
    </HoverPrefetchLink>
  )
};
