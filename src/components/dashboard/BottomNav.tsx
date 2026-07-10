'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { ShieldCheck, KeyRound, Camera, PieChart, User } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { dispatchOpenRecordSheet } from '@/lib/today-actions'
import { dispatchRouteChangeFlush } from '@/lib/route-change-flush'

const tabs = [
  { href: '/dashboard', label: '今天', icon: ShieldCheck, match: (p: string) => p === '/dashboard' },
  { href: '/weekly', label: '記錄', icon: KeyRound, match: (p: string) => p === '/weekly' },
  { href: '/progress', label: '分析', icon: PieChart, match: (p: string) => p === '/progress' },
  { href: '/settings', label: '我的', icon: User, match: (p: string) => p.startsWith('/settings') },
] as const

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function openPhoto() {
    if (pathname === '/dashboard') {
      dispatchOpenRecordSheet()
      return
    }
    router.push('/dashboard?record=1')
  }

  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)

  return (
    <nav
      className="app-bottom-nav app-bottom-nav--v2"
      aria-label="主要導覽"
    >
      <div className="app-bottom-nav__row">
        <div className="flex flex-1 justify-around">
          {left.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={() => dispatchRouteChangeFlush(href)}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] touch-manipulation"
                style={{ color: active ? BB_V2.accent.green : BB_V2.text.secondary }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : BB_V2.iconStroke} />
                <span className="text-[11px] leading-none" style={{ fontWeight: active ? 600 : 400 }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>

        <button
          type="button"
          onClick={openPhoto}
          className="flex flex-col items-center justify-center -mt-6 active:scale-95 transition-transform shrink-0 touch-manipulation"
          style={{
            width: BB_V2.nav.fabSize,
            height: BB_V2.nav.fabSize,
            borderRadius: BB_V2.nav.fabSize / 2,
            backgroundColor: BB_V2.accent.green,
            boxShadow: BB_V2.shadow.fab,
            color: '#FFFFFF',
          }}
          aria-label="拍照記錄"
        >
          <Camera className="h-6 w-6" strokeWidth={2.2} />
        </button>

        <div className="flex flex-1 justify-around">
          {right.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname)
            return (
              <Link
                key={href}
                href={href}
                prefetch
                onClick={() => dispatchRouteChangeFlush(href)}
                className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] touch-manipulation"
                style={{ color: active ? BB_V2.accent.green : BB_V2.text.secondary }}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : BB_V2.iconStroke} />
                <span className="text-[11px] leading-none" style={{ fontWeight: active ? 600 : 400 }}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
