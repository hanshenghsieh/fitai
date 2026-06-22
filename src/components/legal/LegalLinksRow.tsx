'use client'

import { colors } from '@/lib/design-system'

const LINKS = [
  { href: '/privacy', label: '隱私權政策' },
  { href: '/terms', label: '服務條款' },
  { href: '/support', label: '支援中心' },
] as const

export default function LegalLinksRow({ className = '' }: { className?: string }) {
  return (
    <nav
      className={`flex flex-wrap gap-x-4 gap-y-2 text-[13px] ${className}`}
      style={{ color: colors.text.secondary }}
    >
      {LINKS.map(link => (
        <a
          key={link.href}
          href={link.href}
          className="underline underline-offset-2"
          style={{ color: colors.text.secondary }}
        >
          {link.label}
        </a>
      ))}
    </nav>
  )
}
