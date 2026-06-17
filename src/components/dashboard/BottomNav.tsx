'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, CalendarDays, TrendingUp, Settings } from 'lucide-react'

const navItems = [
  { href: '/dashboard', label: '今日', icon: Home },
  { href: '/weekly', label: '本週計畫', icon: CalendarDays },
  { href: '/progress', label: '進度', icon: TrendingUp },
  { href: '/settings', label: '設定', icon: Settings },
]

export default function BottomNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link key={href} href={href} className={`flex-1 flex flex-col items-center py-2.5 gap-1 transition-colors ${active ? 'text-emerald-600' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
