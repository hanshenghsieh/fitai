'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, TrendingUp } from 'lucide-react'
import { TODAY } from '@/lib/today-design'

const navItems = [
  { href: '/dashboard', label: '今日', icon: Home },
  { href: '/weekly', label: '本週', icon: CalendarDays },
  { href: '/progress', label: '進度', icon: TrendingUp },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-area-pb"
      style={{
        backgroundColor: 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(47, 36, 29, 0.06)',
      }}
    >
      <div className="flex max-w-[640px] mx-auto px-6">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-4 gap-1.5"
              style={{ color: active ? TODAY.text : TODAY.textSecondary }}
            >
              <Icon className="h-[19px] w-[19px]" strokeWidth={active ? TODAY.iconStroke + 0.2 : TODAY.iconStroke} />
              <span className="text-[10px]" style={{ fontWeight: active ? 500 : 400 }}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
