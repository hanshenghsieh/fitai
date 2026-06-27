'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, CalendarDays, LineChart, User, Plus } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { isCapacitorNative } from '@/lib/capacitor-native'

const sideItems = [
  { href: '/dashboard', label: '今日', icon: Home, match: (p: string) => p === '/dashboard' },
  { href: '/weekly', label: '本週', icon: CalendarDays, match: (p: string) => p === '/weekly' },
  { href: '/progress', label: '分析', icon: LineChart, match: (p: string) => p === '/progress' },
  { href: '/settings', label: '我的', icon: User, match: (p: string) => p.startsWith('/settings') },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function openPhoto() {
    if (pathname === '/dashboard') {
      router.push('/dashboard?photo=1')
      router.refresh()
      window.dispatchEvent(new CustomEvent('betterbit:open-photo'))
      return
    }
    if (isCapacitorNative()) {
      window.location.href = '/dashboard?photo=1'
      return
    }
    router.push('/dashboard?photo=1')
  }

  function navigateTab(href: string, event: React.MouseEvent<HTMLAnchorElement>) {
    if (pathname === href) return
    if (!isCapacitorNative()) return
    event.preventDefault()
    window.location.assign(href)
  }

  const left = sideItems.slice(0, 2)
  const right = sideItems.slice(2)

  return (
    <nav className="app-bottom-nav" style={{ borderTop: `1px solid ${BB_V2.divider}` }}>
      <div className="flex items-end justify-between max-w-[640px] mx-auto px-6 h-[84px] pb-2">
        <div className="flex flex-1 justify-around">
          {left.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={e => navigateTab(href, e)}
                className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-2"
                style={{ color: active ? BB_V2.accent.orange : BB_V2.text.secondary }}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : BB_V2.iconStroke} />
                <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            )
          })}
        </div>

        <button
          type="button"
          onClick={openPhoto}
          className="flex items-center justify-center -mt-7 active:scale-95 transition-transform"
          style={{
            width: BB_V2.nav.fabSize,
            height: BB_V2.nav.fabSize,
            borderRadius: BB_V2.nav.fabSize / 2,
            backgroundColor: BB_V2.accent.orange,
            boxShadow: BB_V2.shadow.fab,
            color: '#FFFFFF',
          }}
          aria-label="拍照記錄"
        >
          <Plus className="h-7 w-7" strokeWidth={2.5} />
        </button>

        <div className="flex flex-1 justify-around">
          {right.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                onClick={e => navigateTab(href, e)}
                className="flex flex-col items-center justify-center gap-1 min-w-[56px] py-2"
                style={{ color: active ? BB_V2.accent.orange : BB_V2.text.secondary }}
              >
                <Icon className="h-[22px] w-[22px]" strokeWidth={active ? 2.2 : BB_V2.iconStroke} />
                <span className="text-[10px]" style={{ fontWeight: active ? 600 : 400 }}>{label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
