'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, TrendingUp, Settings } from 'lucide-react'
import { colors } from '@/lib/design-system'

const navItems = [
  { href: '/dashboard', label: '今日', icon: Home },
  { href: '/weekly', label: '本週', icon: CalendarDays },
  { href: '/progress', label: '進度', icon: TrendingUp },
  { href: '/settings', label: '設定', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t"
      style={{ backgroundColor: colors.bg.elevated, borderColor: colors.border.subtle }}
    >
      <div className="flex max-w-lg mx-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors"
              style={{ color: active ? colors.accent.action : colors.text.tertiary }}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[11px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
