'use client'

import { usePathname, useRouter } from 'next/navigation'
import { ShieldCheck, KeyRound, Camera, PieChart, User } from 'lucide-react'
import { BB_V2 } from '@/lib/betterbit-v2'
import { dispatchOpenRecordSheet } from '@/lib/today-actions'
import { dispatchRouteChangeFlush } from '@/lib/route-change-flush'
import { isCapacitorNative } from '@/lib/capacitor-native'

const tabs = [
  { href: '/dashboard', label: '今天', icon: ShieldCheck, match: (p: string) => p === '/dashboard' || p === '/dashboard.html' },
  { href: '/weekly', label: '記錄', icon: KeyRound, match: (p: string) => p === '/weekly' || p === '/weekly.html' },
  { href: '/progress', label: '分析', icon: PieChart, match: (p: string) => p === '/progress' || p === '/progress.html' },
  { href: '/settings', label: '我的', icon: User, match: (p: string) => p.startsWith('/settings') },
] as const

/**
 * Capacitor iOS Router maps ANY extensionless path to /index.html
 * (see CapacitorRouter.route). Hard-navigating to /weekly therefore loads the
 * root Landing page → RootRedirectClient sends logged-in users to /dashboard.
 * Always soft-navigate first; only fall back to the *.html static file.
 */
function nativeHtmlFallback(href: string): string {
  const [path, query = ''] = href.split('?')
  const clean = path.endsWith('.html') ? path : `${path}.html`
  return query ? `${clean}?${query}` : clean
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  function go(href: string, tabLabel: string) {
    const before = typeof window !== 'undefined' ? window.location.pathname : pathname
    console.log('[TAB] click =', tabLabel)
    console.log('[TAB] target route =', href)
    console.log('[TAB] current route before =', before)
    dispatchRouteChangeFlush(href)

    console.log('[TAB] router push start')
    router.push(href)
    console.log('[TAB] router push done')

    if (!isCapacitorNative()) {
      window.setTimeout(() => {
        console.log('[TAB] current route after =', window.location.pathname)
      }, 350)
      return
    }

    // If soft nav stalls (pathname unchanged), load the real static HTML file.
    // Never assign('/weekly') — Capcitor will serve index.html and bounce to Today.
    window.setTimeout(() => {
      const after = window.location.pathname
      console.log('[TAB] current route after =', after)
      const arrived =
        after === href ||
        after === `${href}.html` ||
        after.startsWith(`${href}/`)
      if (!arrived) {
        const fallback = nativeHtmlFallback(href)
        console.log('[TAB] fallback assign =', fallback)
        window.location.assign(fallback)
      }
    }, 350)
  }

  function openPhoto() {
    console.log('[TAB] click = camera')
    console.log('[CAMERA] click')
    console.log('[CAMERA] permission status = deferred-to-record-sheet')
    if (pathname === '/dashboard' || pathname === '/dashboard.html') {
      console.log('[CAMERA] open start = record sheet event')
      dispatchOpenRecordSheet()
      return
    }
    console.log('[TAB] target route =', '/dashboard?record=1')
    console.log('[TAB] router push start')
    router.push('/dashboard?record=1')
    console.log('[TAB] router push done')
  }

  const left = tabs.slice(0, 2)
  const right = tabs.slice(2)

  const tabButton = ({ href, label, icon: Icon, match }: (typeof tabs)[number]) => {
    const active = match(pathname)
    return (
      <button
        key={href}
        type="button"
        onClick={() => go(href, label)}
        className="flex flex-col items-center justify-center gap-0.5 min-w-[52px] min-h-[44px] touch-manipulation"
        style={{ color: active ? BB_V2.accent.green : BB_V2.text.secondary, pointerEvents: 'auto', background: 'none', border: 'none' }}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="h-5 w-5" strokeWidth={active ? 2.2 : BB_V2.iconStroke} />
        <span className="text-[11px] leading-none" style={{ fontWeight: active ? 600 : 400 }}>
          {label}
        </span>
      </button>
    )
  }

  return (
    <nav className="app-bottom-nav app-bottom-nav--v2" aria-label="主要導覽" style={{ pointerEvents: 'auto', zIndex: 60 }}>
      <div className="app-bottom-nav__row" style={{ pointerEvents: 'auto' }}>
        <div className="flex flex-1 justify-around">{left.map(tabButton)}</div>

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
            pointerEvents: 'auto',
            border: 'none',
          }}
          aria-label="拍照記錄"
        >
          <Camera className="h-6 w-6" strokeWidth={2.2} />
        </button>

        <div className="flex flex-1 justify-around">{right.map(tabButton)}</div>
      </div>
    </nav>
  )
}
